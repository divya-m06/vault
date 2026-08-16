import base64
from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Base64 / length helpers
# ---------------------------------------------------------------------------
# All vault crypto blobs are transported as standard base64 (produced by
# btoa() in the browser). These validators check the DECODED byte length,
# never the encoded string length, and reject invalid base64 outright.
#
# Size contract (matches the frontend crypto code in vaultService.js):
#   - salt: 16 bytes  (crypto.getRandomValues(new Uint8Array(16)))
#   - iv:   12 bytes  (AES-GCM nonce)
#   - verifier ciphertext: >= 48 bytes (32-byte verifier + 16-byte GCM tag)
#   - item ciphertext:     >= 16 bytes (AES-GCM tag alone; real payloads are far larger)
#   - kdf_iterations:      >= 100000 (frontend uses 250000; floor set below it)


def _decode_base64(value: str) -> bytes:
    try:
        return base64.b64decode(value, validate=True)
    except Exception as exc:
        raise ValueError("must be valid standard base64") from exc


def _check_length(value: str, *, exact: int | None = None, minimum: int | None = None) -> None:
    decoded = _decode_base64(value)
    if exact is not None and len(decoded) != exact:
        raise ValueError(f"must decode to exactly {exact} bytes")
    if minimum is not None and len(decoded) < minimum:
        raise ValueError(f"must decode to at least {minimum} bytes")


class VaultMetaCreate(BaseModel):
    crypto_version: int = 1
    kdf_algorithm: str = "PBKDF2-HMAC-SHA-256"
    kdf_iterations: int = Field(250000, ge=100000, description="PBKDF2 iteration count (frontend uses 250000)")
    kdf_salt: str = Field(..., description="Base64-encoded 16-byte salt")
    verifier_iv: str = Field(..., description="Base64-encoded 12-byte IV")
    verifier_ciphertext: str = Field(..., description="Base64-encoded 32-byte encrypted verifier")
    auto_lock_minutes: int = 15

    @field_validator("kdf_salt")
    @classmethod
    def _validate_kdf_salt(cls, v: str) -> str:
        _check_length(v, exact=16)
        return v

    @field_validator("verifier_iv")
    @classmethod
    def _validate_verifier_iv(cls, v: str) -> str:
        _check_length(v, exact=12)
        return v

    @field_validator("verifier_ciphertext")
    @classmethod
    def _validate_verifier_ciphertext(cls, v: str) -> str:
        _check_length(v, minimum=48)
        return v


class VaultMetaUpdate(BaseModel):
    auto_lock_minutes: int = Field(..., ge=0)


class VaultMetaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    crypto_version: int
    kdf_algorithm: str
    kdf_iterations: int
    kdf_salt: str
    verifier_iv: str
    verifier_ciphertext: str
    auto_lock_minutes: int
    created_at: datetime
    updated_at: datetime


class _VaultItemEnvelope(BaseModel):
    """Shared encrypted-field validation for item create/update schemas."""

    iv: str = Field(..., description="Base64-encoded 12-byte IV")
    ciphertext: str = Field(..., description="Base64-encoded encrypted JSON payload")

    @field_validator("iv")
    @classmethod
    def _validate_iv(cls, v: str) -> str:
        _check_length(v, exact=12)
        return v

    @field_validator("ciphertext")
    @classmethod
    def _validate_ciphertext(cls, v: str) -> str:
        _check_length(v, minimum=16)
        return v


class VaultItemCreate(_VaultItemEnvelope):
    item_type: Literal["password", "note", "file"]
    crypto_version: int = 1


class VaultItemUpdate(_VaultItemEnvelope):
    pass


class VaultItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_type: str
    iv: str
    ciphertext: str
    crypto_version: int
    created_at: datetime
    updated_at: datetime