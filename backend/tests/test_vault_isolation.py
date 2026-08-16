"""
Backend vault isolation tests.

These tests prove user A cannot read/update/delete user B's vault items
even with a valid token (IDOR protection).

Run with:  python -m pytest backend/tests/test_vault_isolation.py -v
"""

import sys
import base64
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jose import jwt

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.main import app
from app.api.auth import limiter
from app.models.vault import VaultItem, VaultMeta
from app.models.user import User

# ---------------------------------------------------------------------------
# Test setup — fresh schema for every test module run
# ---------------------------------------------------------------------------
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

USER_A_EMAIL = "usera@example.com"
USER_A_PASSWORD = "Password123!"
USER_B_EMAIL = "userb@example.com"
USER_B_PASSWORD = "Password123!"


def make_vault_meta_payload():
    """Create a valid vault meta payload for testing."""
    return {
        "crypto_version": 1,
        "kdf_algorithm": "PBKDF2-HMAC-SHA-256",
        "kdf_iterations": 250000,
        "kdf_salt": base64.b64encode(b"a" * 16).decode(),
        "verifier_iv": base64.b64encode(b"b" * 12).decode(),
        "verifier_ciphertext": base64.b64encode(b"c" * 48).decode(),
        "auto_lock_minutes": 15,
    }


def make_item_payload(item_type="password"):
    """Create a valid vault item payload for testing."""
    return {
        "item_type": item_type,
        "iv": base64.b64encode(b"x" * 12).decode(),
        "ciphertext": base64.b64encode(b"encrypted-json-payload").decode(),
        "crypto_version": 1,
    }


@pytest.fixture(autouse=True)
def reset_rate_limit():
    limiter._storage.reset()


@pytest.fixture(autouse=True)
def clean_db():
    """Clean vault tables before each test."""
    db = SessionLocal()
    try:
        db.query(VaultItem).delete()
        db.query(VaultMeta).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def user_a_token():
    """Register and login user A, return access token."""
    resp = client.post("/register", json={"email": USER_A_EMAIL, "password": USER_A_PASSWORD})
    assert resp.status_code == 201

    resp = client.post("/login", json={"email": USER_A_EMAIL, "password": USER_A_PASSWORD})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def user_b_token():
    """Register and login user B, return access token."""
    resp = client.post("/register", json={"email": USER_B_EMAIL, "password": USER_B_PASSWORD})
    assert resp.status_code == 201

    resp = client.post("/login", json={"email": USER_B_EMAIL, "password": USER_B_PASSWORD})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def user_a_vault(user_a_token):
    """Create vault meta for user A."""
    resp = client.post(
        "/vault/meta",
        json=make_vault_meta_payload(),
        headers={"Authorization": f"Bearer {user_a_token}"}
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def user_b_vault(user_b_token):
    """Create vault meta for user B."""
    resp = client.post(
        "/vault/meta",
        json=make_vault_meta_payload(),
        headers={"Authorization": f"Bearer {user_b_token}"}
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def user_b_item(user_b_token, user_b_vault):
    """Create a vault item for user B."""
    resp = client.post(
        "/vault/items",
        json=make_item_payload("password"),
        headers={"Authorization": f"Bearer {user_b_token}"}
    )
    assert resp.status_code == 201
    return resp.json()


# ============================================================
# VAULT META ISOLATION TESTS
# ============================================================

class TestVaultMetaIsolation:
    def test_user_a_cannot_get_user_b_meta(self, user_a_token, user_b_vault):
        """User A calling GET /vault/meta should only see their own (or 404)."""
        # User A has no vault yet, should get 404
        resp = client.get("/vault/meta", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 404

        # Create vault for A
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        # Now A should see their own meta
        resp = client.get("/vault/meta", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json()["auto_lock_minutes"] == 15

    def test_user_a_cannot_create_meta_twice(self, user_a_token):
        """POST /vault/meta returns 409 if vault already exists."""
        resp = client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 201

        # Second call should fail with 409 (vault already exists)
        resp = client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 409

    def test_user_a_can_update_own_meta(self, user_a_token, user_a_vault):
        """User A calling PATCH /vault/meta should update their own."""
        # User A has a vault, can update
        resp = client.patch("/vault/meta", json={"auto_lock_minutes": 30}, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json()["auto_lock_minutes"] == 30


# ============================================================
# VAULT ITEMS ISOLATION TESTS
# ============================================================

class TestVaultItemsIsolation:
    def test_user_a_cannot_list_user_b_items(self, user_a_token, user_b_item):
        """User A calling GET /vault/items should only see their own items."""
        # User B has an item, User A should see empty list
        resp = client.get("/vault/items", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_user_a_cannot_get_user_b_item_by_id(self, user_a_token, user_b_item):
        """User A calling GET /vault/items/{id} for B's item should get 404."""
        item_id = user_b_item["id"]
        resp = client.get(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 404

    def test_user_a_cannot_update_user_b_item(self, user_a_token, user_b_item):
        """User A calling PATCH /vault/items/{id} for B's item should get 404."""
        item_id = user_b_item["id"]
        resp = client.patch(
            f"/vault/items/{item_id}",
            json=make_item_payload("note"),
            headers={"Authorization": f"Bearer {user_a_token}"}
        )
        assert resp.status_code == 404

    def test_user_a_cannot_delete_user_b_item(self, user_a_token, user_b_item):
        """User A calling DELETE /vault/items/{id} for B's item should get 404."""
        item_id = user_b_item["id"]
        resp = client.delete(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 404

    def test_user_b_can_access_own_item(self, user_b_token, user_b_vault):
        """Positive control: User B can access their own item."""
        # Create an item for user B
        resp = client.post(
            "/vault/items",
            json=make_item_payload("password"),
            headers={"Authorization": f"Bearer {user_b_token}"}
        )
        assert resp.status_code == 201
        item_id = resp.json()["id"]

        # GET single item
        resp = client.get(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_b_token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == item_id

        # PATCH own item (updates iv/ciphertext, not item_type)
        resp = client.patch(
            f"/vault/items/{item_id}",
            json=make_item_payload("note"),
            headers={"Authorization": f"Bearer {user_b_token}"}
        )
        assert resp.status_code == 200
        # item_type is not updated by PATCH, only iv and ciphertext
        assert resp.json()["item_type"] == "password"

        # DELETE own item
        resp = client.delete(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_b_token}"})
        assert resp.status_code == 204

        # Verify deleted
        resp = client.get(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_b_token}"})
        assert resp.status_code == 404

    def test_user_a_list_only_shows_own_items(self, user_a_token, user_b_item):
        """After creating items, User A only sees their own."""
        # Create items for A
        item1 = client.post("/vault/items", json=make_item_payload("password"), headers={"Authorization": f"Bearer {user_a_token}"}).json()
        item2 = client.post("/vault/items", json=make_item_payload("note"), headers={"Authorization": f"Bearer {user_a_token}"}).json()

        # List should show only A's items
        resp = client.get("/vault/items", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 2
        item_ids = {i["id"] for i in items}
        assert item1["id"] in item_ids
        assert item2["id"] in item_ids
        assert user_b_item["id"] not in item_ids


# ============================================================
# AUTHENTICATION REQUIREMENT TESTS
# ============================================================

class TestVaultAuthRequired:
    def test_no_token_rejected(self):
        """All vault endpoints require authentication."""
        endpoints = [
            ("GET", "/vault/meta"),
            ("POST", "/vault/meta"),
            ("PATCH", "/vault/meta"),
            ("GET", "/vault/items"),
            ("POST", "/vault/items"),
            ("GET", "/vault/items/some-id"),
            ("PATCH", "/vault/items/some-id"),
            ("DELETE", "/vault/items/some-id"),
        ]
        for method, path in endpoints:
            resp = client.request(method, path)
            assert resp.status_code in (401, 403), f"{method} {path} should require auth"

    def test_expired_token_rejected(self, user_a_token):
        """Expired JWT should be rejected by vault endpoints."""
        # Create an expired token
        payload = {
            "sub": "1",
            "email": USER_A_EMAIL,
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jwt.encode(payload, settings.secret_key, algorithm="HS256")

        endpoints = [
            ("GET", "/vault/meta"),
            ("GET", "/vault/items"),
        ]
        for method, path in endpoints:
            resp = client.request(method, path, headers={"Authorization": f"Bearer {expired_token}"})
            assert resp.status_code == 401, f"{method} {path} should reject expired token"

    def test_malformed_token_rejected(self):
        """Malformed JWT should be rejected."""
        endpoints = [
            ("GET", "/vault/meta"),
            ("GET", "/vault/items"),
        ]
        for method, path in endpoints:
            resp = client.request(method, path, headers={"Authorization": "Bearer not.a.real.token"})
            assert resp.status_code == 401, f"{method} {path} should reject malformed token"


# ============================================================
# VAULT META CREATE/GET ROUND-TRIP TESTS
# ============================================================

class TestVaultMetaRoundTrip:
    def test_create_and_get_meta(self, user_a_token):
        """Create vault meta then fetch it — verify all fields."""
        payload = make_vault_meta_payload()

        # Create
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 201
        created = resp.json()

        # Verify all fields match
        assert created["crypto_version"] == payload["crypto_version"]
        assert created["kdf_algorithm"] == payload["kdf_algorithm"]
        assert created["kdf_iterations"] == payload["kdf_iterations"]
        assert created["kdf_salt"] == payload["kdf_salt"]
        assert created["verifier_iv"] == payload["verifier_iv"]
        assert created["verifier_ciphertext"] == payload["verifier_ciphertext"]
        assert created["auto_lock_minutes"] == payload["auto_lock_minutes"]
        assert "created_at" in created
        assert "updated_at" in created

        # Get
        resp = client.get("/vault/meta", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        fetched = resp.json()
        assert fetched == created

    def test_update_auto_lock_minutes(self, user_a_token):
        """Update auto_lock_minutes via PATCH."""
        # Create vault
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        # Update
        resp = client.patch("/vault/meta", json={"auto_lock_minutes": 30}, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json()["auto_lock_minutes"] == 30

        # Verify persisted
        resp = client.get("/vault/meta", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json()["auto_lock_minutes"] == 30


# ============================================================
# VAULT ITEMS CRUD TESTS
# ============================================================

class TestVaultItemsCRUD:
    def test_create_get_update_delete_item(self, user_a_token):
        """Full CRUD round-trip for a single item."""
        # User A needs a vault first
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        # CREATE
        payload = make_item_payload("password")
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 201
        item = resp.json()
        item_id = item["id"]

        assert item["item_type"] == "password"
        assert item["iv"] == payload["iv"]
        assert item["ciphertext"] == payload["ciphertext"]
        assert item["crypto_version"] == 1
        assert "created_at" in item
        assert "updated_at" in item

        # GET single
        resp = client.get(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json() == item

        # LIST
        resp = client.get("/vault/items", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["id"] == item_id

        # UPDATE
        update_payload = make_item_payload("note")
        resp = client.patch(f"/vault/items/{item_id}", json=update_payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["item_type"] == "password"  # item_type not updated by PATCH
        assert updated["iv"] == update_payload["iv"]
        assert updated["ciphertext"] == update_payload["ciphertext"]
        assert updated["id"] == item_id

        # DELETE
        resp = client.delete(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 204

        # Verify deleted
        resp = client.get(f"/vault/items/{item_id}", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 404

        resp = client.get("/vault/items", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_multiple_item_types(self, user_a_token):
        """Create items of all three types."""
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        for item_type in ["password", "note", "file"]:
            resp = client.post("/vault/items", json=make_item_payload(item_type), headers={"Authorization": f"Bearer {user_a_token}"})
            assert resp.status_code == 201
            assert resp.json()["item_type"] == item_type

        resp = client.get("/vault/items", headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_item_type_validation(self, user_a_token):
        """Invalid item_type should be rejected."""
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        payload = make_item_payload("invalid_type")
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422


# ============================================================
# BASE64 / LENGTH VALIDATION TESTS
# ============================================================

class TestBase64Validation:
    def test_invalid_base64_rejected(self, user_a_token):
        """Invalid base64 in request body should return 422."""
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        payload = make_item_payload("password")
        payload["iv"] = "not-valid-base64!!!"
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

        payload = make_item_payload("password")
        payload["ciphertext"] = "also-invalid!!!"
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_wrong_length_iv_rejected(self, user_a_token):
        """Item IV must decode to exactly 12 bytes (AES-GCM nonce)."""
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        payload = make_item_payload("password")
        payload["iv"] = base64.b64encode(b"x" * 13).decode()
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_short_item_ciphertext_rejected(self, user_a_token):
        """Item ciphertext must decode to at least 16 bytes (GCM auth tag)."""
        client.post("/vault/meta", json=make_vault_meta_payload(), headers={"Authorization": f"Bearer {user_a_token}"})

        payload = make_item_payload("password")
        payload["ciphertext"] = base64.b64encode(b"short").decode()
        resp = client.post("/vault/items", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422


class TestVaultMetaValidation:
    def test_short_salt_rejected(self, user_a_token):
        """kdf_salt must decode to exactly 16 bytes."""
        payload = make_vault_meta_payload()
        payload["kdf_salt"] = base64.b64encode(b"a" * 8).decode()
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_long_salt_rejected(self, user_a_token):
        """kdf_salt must decode to exactly 16 bytes."""
        payload = make_vault_meta_payload()
        payload["kdf_salt"] = base64.b64encode(b"a" * 24).decode()
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_wrong_length_verifier_iv_rejected(self, user_a_token):
        """verifier_iv must decode to exactly 12 bytes."""
        payload = make_vault_meta_payload()
        payload["verifier_iv"] = base64.b64encode(b"b" * 16).decode()
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_short_verifier_ciphertext_rejected(self, user_a_token):
        """verifier_ciphertext must decode to at least 48 bytes (32 verifier + 16 GCM tag)."""
        payload = make_vault_meta_payload()
        payload["verifier_ciphertext"] = base64.b64encode(b"c" * 32).decode()
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422

    def test_low_kdf_iterations_rejected(self, user_a_token):
        """kdf_iterations below the floor must be rejected."""
        payload = make_vault_meta_payload()
        payload["kdf_iterations"] = 1000
        resp = client.post("/vault/meta", json=payload, headers={"Authorization": f"Bearer {user_a_token}"})
        assert resp.status_code == 422