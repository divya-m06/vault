import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    vault_meta: Mapped["VaultMeta"] = relationship(
        "VaultMeta", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    vault_items: Mapped[List["VaultItem"]] = relationship(
        "VaultItem", back_populates="user", cascade="all, delete-orphan"
    )
