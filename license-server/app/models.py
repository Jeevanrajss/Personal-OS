from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, String, Text, func
from app.database import Base


# ── Key format: PERS-XXXX-XXXX-XXXX ─────────────────────────────────────────
# Alphabet excludes visually confusing chars: 0/O, 1/I, 8/B
_ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ234567"


def _generate_key() -> str:
    """Generate a unique registration key in PERS-XXXX-XXXX-XXXX format."""
    parts = ["".join(secrets.choice(_ALPHABET) for _ in range(4)) for _ in range(3)]
    return f"PERS-{'-'.join(parts)}"


class LicenseKey(Base):
    __tablename__ = "license_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, nullable=False, index=True)

    # Owner info
    owner_name = Column(String, nullable=False)
    owner_email = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Device binding — set on first activation, NULL = not yet activated
    machine_id = Column(String, nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    activated_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)   # NULL = active

    # ── Helpers ──────────────────────────────────────────────────────────────

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    @property
    def is_activated(self) -> bool:
        return self.machine_id is not None

    @property
    def status(self) -> str:
        if self.is_revoked:
            return "revoked"
        if self.is_activated:
            return "active"
        return "unactivated"

    @classmethod
    def create(cls, owner_name: str, owner_email: Optional[str] = None, notes: Optional[str] = None) -> "LicenseKey":
        return cls(
            id=str(uuid.uuid4()),
            key=_generate_key(),
            owner_name=owner_name,
            owner_email=owner_email,
            notes=notes,
        )
