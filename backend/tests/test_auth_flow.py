"""
Backend auth flow tests.

These tests exercise:
  1. Successful login returns a valid JWT.
  2. Invalid credentials are rejected with 401.
  3. An expired JWT is rejected by a protected endpoint (/me) with 401.
     This proves the server-side check works independently of the client-side
     expiry timer in AuthContext.

Run with:  python -m pytest backend/tests/test_auth_flow.py -v
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jose import jwt

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.database import Base, engine
from app.main import app
from app.api.auth import limiter

# ---------------------------------------------------------------------------
# Test setup — fresh schema for every test module run
# ---------------------------------------------------------------------------
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

TEST_EMAIL = "authflow@example.com"
TEST_PASSWORD = "Password123!"

@pytest.fixture(autouse=True)
def reset_rate_limit():
    limiter._storage.reset()


@pytest.fixture(scope="module", autouse=True)
def registered_user():
    """Register a test user once for the whole module."""
    resp = client.post("/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert resp.status_code == 201, f"Registration failed: {resp.text}"
    return resp.json()


# ---------------------------------------------------------------------------
# 1. Successful login
# ---------------------------------------------------------------------------
class TestLogin:
    def test_valid_credentials_return_token(self):
        resp = client.post("/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"].lower() == "bearer"

    def test_token_contains_expected_claims(self):
        resp = client.post("/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = resp.json()["access_token"]
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        assert payload["email"] == TEST_EMAIL
        assert "sub" in payload
        assert "exp" in payload

    def test_token_expiry_matches_config(self):
        before = datetime.now(timezone.utc)
        resp = client.post("/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = resp.json()["access_token"]
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_delta = timedelta(minutes=settings.access_token_expires_minutes)
        # Allow ±5 seconds of clock drift in the assertion
        assert abs((exp - before - expected_delta).total_seconds()) < 5


# ---------------------------------------------------------------------------
# 2. Invalid credentials are rejected
# ---------------------------------------------------------------------------
class TestLoginFailures:
    def test_wrong_password_returns_401(self):
        resp = client.post("/login", json={"email": TEST_EMAIL, "password": "WrongPassword!"})
        assert resp.status_code == 401

    def test_unknown_email_returns_401(self):
        resp = client.post("/login", json={"email": "nobody@example.com", "password": TEST_PASSWORD})
        assert resp.status_code == 401

    def test_missing_fields_returns_422(self):
        resp = client.post("/login", json={"email": TEST_EMAIL})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 3. Expired JWT is rejected server-side (the key test)
# ---------------------------------------------------------------------------
class TestExpiredJWT:
    def _make_expired_token(self) -> str:
        """Build a properly signed token with exp set one hour in the past."""
        payload = {
            "sub": "1",
            "email": TEST_EMAIL,
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        return jwt.encode(payload, settings.secret_key, algorithm="HS256")

    def test_expired_token_rejected_by_me_endpoint(self):
        """
        This test confirms that the server-side JWT verification rejects an
        expired token, independent of any client-side timer logic.
        """
        expired_token = self._make_expired_token()
        resp = client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401, (
            f"Expected 401 for expired token, got {resp.status_code}: {resp.text}"
        )

    def test_no_token_rejected_by_me_endpoint(self):
        resp = client.get("/me")
        assert resp.status_code in (401, 403)

    def test_malformed_token_rejected_by_me_endpoint(self):
        resp = client.get("/me", headers={"Authorization": "Bearer not.a.real.token"})
        assert resp.status_code == 401

    def test_valid_token_accepted_by_me_endpoint(self):
        login_resp = client.post("/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = login_resp.json()["access_token"]
        resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == TEST_EMAIL
        # Confirm no vault secrets are leaked in the response
        body = resp.json()
        assert "password" not in body
        assert "password_hash" not in body
        assert "master_password" not in body


# ---------------------------------------------------------------------------
# 4. Rate limiting is enforced
# ---------------------------------------------------------------------------
class TestRateLimiting:
    def test_login_rate_limit(self):
        # We allow 5 requests per minute. We'll send 6.
        # Use a dummy email to avoid side-effects
        email = "ratelimit_test@example.com"
        password = "Password123!"
        
        # Send 6 requests in rapid succession
        responses = []
        for _ in range(6):
            resp = client.post("/login", json={"email": email, "password": password})
            responses.append(resp)
            
        # The 6th request should be 429 Too Many Requests
        assert responses[-1].status_code == 429
        assert "Rate limit exceeded" in responses[-1].text

