import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import BYTEA, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class VaultMeta(Base):
    __tablename__ = "vault_meta"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    crypto_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    kdf_algorithm: Mapped[str] = mapped_column(String(30), nullable=False, default="PBKDF2-HMAC-SHA-256")
    kdf_iterations: Mapped[int] = mapped_column(Integer, nullable=False, default=250000)
    kdf_salt: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    verifier_iv: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    verifier_ciphertext: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    auto_lock_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="vault_meta")


class VaultItem(Base):
    __tablename__ = "vault_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    iv: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    ciphertext: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    crypto_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="vault_items")

    __table_args__ = (
        UniqueConstraint("user_id", "id", name="uq_vault_items_user_id_id"),
    )