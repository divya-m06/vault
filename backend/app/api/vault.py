import base64
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.database import SessionLocal
from ..models.vault import VaultItem, VaultMeta
from ..schemas.vault import (
    VaultItemCreate,
    VaultItemResponse,
    VaultItemUpdate,
    VaultMetaCreate,
    VaultMetaResponse,
    VaultMetaUpdate,
)
from .auth import get_current_user, get_client_ip
from ..models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_client_ip)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def b64decode(s: str) -> bytes:
    try:
        return base64.b64decode(s)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoding",
        )


def b64encode(b: bytes) -> str:
    return base64.b64encode(b).decode()


# ============================================================
# VAULT META ENDPOINTS
# ============================================================

@router.get("/vault/meta", response_model=VaultMetaResponse)
@limiter.limit("30/minute")
def get_vault_meta(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch vault crypto metadata for the authenticated user.
    Returns 404 if no vault exists yet.
    Ownership enforced by: querying vault_meta WHERE user_id = current_user.id
    """
    vault_meta = db.get(VaultMeta, current_user.id)
    if vault_meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No vault initialized for this account",
        )

    return VaultMetaResponse(
        crypto_version=vault_meta.crypto_version,
        kdf_algorithm=vault_meta.kdf_algorithm,
        kdf_iterations=vault_meta.kdf_iterations,
        kdf_salt=b64encode(vault_meta.kdf_salt),
        verifier_iv=b64encode(vault_meta.verifier_iv),
        verifier_ciphertext=b64encode(vault_meta.verifier_ciphertext),
        auto_lock_minutes=vault_meta.auto_lock_minutes,
        created_at=vault_meta.created_at,
        updated_at=vault_meta.updated_at,
    )


@router.post("/vault/meta", response_model=VaultMetaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_vault_meta(
    request: Request,
    meta_in: VaultMetaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create vault crypto metadata for the authenticated user.
    Returns 409 if vault already exists (prevents accidental salt/verifier overwrite).
    Ownership enforced by: inserting with user_id = current_user.id (never from request)
    """
    existing = db.get(VaultMeta, current_user.id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vault already initialized for this account",
        )

    vault_meta = VaultMeta(
        user_id=current_user.id,
        crypto_version=meta_in.crypto_version,
        kdf_algorithm=meta_in.kdf_algorithm,
        kdf_iterations=meta_in.kdf_iterations,
        kdf_salt=b64decode(meta_in.kdf_salt),
        verifier_iv=b64decode(meta_in.verifier_iv),
        verifier_ciphertext=b64decode(meta_in.verifier_ciphertext),
        auto_lock_minutes=meta_in.auto_lock_minutes,
    )

    db.add(vault_meta)
    db.commit()
    db.refresh(vault_meta)

    return VaultMetaResponse(
        crypto_version=vault_meta.crypto_version,
        kdf_algorithm=vault_meta.kdf_algorithm,
        kdf_iterations=vault_meta.kdf_iterations,
        kdf_salt=b64encode(vault_meta.kdf_salt),
        verifier_iv=b64encode(vault_meta.verifier_iv),
        verifier_ciphertext=b64encode(vault_meta.verifier_ciphertext),
        auto_lock_minutes=vault_meta.auto_lock_minutes,
        created_at=vault_meta.created_at,
        updated_at=vault_meta.updated_at,
    )


@router.patch("/vault/meta", response_model=VaultMetaResponse)
@limiter.limit("30/minute")
def update_vault_meta(
    request: Request,
    meta_in: VaultMetaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update vault metadata (currently only auto_lock_minutes).
    Ownership enforced by: UPDATE vault_meta WHERE user_id = current_user.id
    """
    vault_meta = db.get(VaultMeta, current_user.id)
    if vault_meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No vault initialized for this account",
        )

    vault_meta.auto_lock_minutes = meta_in.auto_lock_minutes
    vault_meta.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(vault_meta)

    return VaultMetaResponse(
        crypto_version=vault_meta.crypto_version,
        kdf_algorithm=vault_meta.kdf_algorithm,
        kdf_iterations=vault_meta.kdf_iterations,
        kdf_salt=b64encode(vault_meta.kdf_salt),
        verifier_iv=b64encode(vault_meta.verifier_iv),
        verifier_ciphertext=b64encode(vault_meta.verifier_ciphertext),
        auto_lock_minutes=vault_meta.auto_lock_minutes,
        created_at=vault_meta.created_at,
        updated_at=vault_meta.updated_at,
    )


# ============================================================
# VAULT ITEMS ENDPOINTS
# ============================================================

@router.get("/vault/items", response_model=List[VaultItemResponse])
@limiter.limit("60/minute")
def list_vault_items(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all vault items for the authenticated user.
    Ownership enforced by: SELECT * FROM vault_items WHERE user_id = current_user.id
    """
    items = db.execute(
        select(VaultItem).where(VaultItem.user_id == current_user.id)
    ).scalars().all()

    return [
        VaultItemResponse(
            id=item.id,
            item_type=item.item_type,
            iv=b64encode(item.iv),
            ciphertext=b64encode(item.ciphertext),
            crypto_version=item.crypto_version,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.post("/vault/items", response_model=VaultItemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_vault_item(
    request: Request,
    item_in: VaultItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new vault item for the authenticated user.
    Ownership enforced by: inserting with user_id = current_user.id (never from request)
    """
    item = VaultItem(
        user_id=current_user.id,
        item_type=item_in.item_type,
        iv=b64decode(item_in.iv),
        ciphertext=b64decode(item_in.ciphertext),
        crypto_version=item_in.crypto_version,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return VaultItemResponse(
        id=item.id,
        item_type=item.item_type,
        iv=b64encode(item.iv),
        ciphertext=b64encode(item.ciphertext),
        crypto_version=item.crypto_version,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/vault/items/{item_id}", response_model=VaultItemResponse)
@limiter.limit("30/minute")
def get_vault_item(
    request: Request,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a single vault item by ID.
    Ownership enforced by: WHERE id = item_id AND user_id = current_user.id
    Returns 404 if not found or not owned by user.
    """
    item = db.execute(
        select(VaultItem).where(
            VaultItem.id == item_id,
            VaultItem.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vault item not found",
        )

    return VaultItemResponse(
        id=item.id,
        item_type=item.item_type,
        iv=b64encode(item.iv),
        ciphertext=b64encode(item.ciphertext),
        crypto_version=item.crypto_version,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/vault/items/{item_id}", response_model=VaultItemResponse)
@limiter.limit("30/minute")
def update_vault_item(
    request: Request,
    item_id: str,
    item_in: VaultItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a vault item.
    Ownership enforced by: UPDATE vault_items SET ... WHERE id = item_id AND user_id = current_user.id
    Returns 404 if not found or not owned by user.
    """
    item = db.execute(
        select(VaultItem).where(
            VaultItem.id == item_id,
            VaultItem.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vault item not found",
        )

    item.iv = b64decode(item_in.iv)
    item.ciphertext = b64decode(item_in.ciphertext)
    item.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(item)

    return VaultItemResponse(
        id=item.id,
        item_type=item.item_type,
        iv=b64encode(item.iv),
        ciphertext=b64encode(item.ciphertext),
        crypto_version=item.crypto_version,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/vault/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def delete_vault_item(
    request: Request,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a vault item.
    Ownership enforced by: DELETE FROM vault_items WHERE id = item_id AND user_id = current_user.id
    Returns 404 if not found or not owned by user.
    """
    item = db.execute(
        select(VaultItem).where(
            VaultItem.id == item_id,
            VaultItem.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vault item not found",
        )

    db.delete(item)
    db.commit()