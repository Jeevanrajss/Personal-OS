"""Account model — bank accounts, credit/debit cards, wallets."""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, String, Text

from app.db import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(100), nullable=False)
    # savings | credit_card | debit_card | wallet | upi | cash
    type = Column(String(20), nullable=False, default="savings")
    bank = Column(String(60), nullable=True)
    last4 = Column(String(4), nullable=True)
    credit_limit = Column(Float, nullable=True)
    # JSON blob: {"perks": [...], "cashback": {"category": pct}}
    benefits_json = Column(Text, nullable=True)
    # Tailwind color stem, e.g. "violet", "sky", "emerald"
    color = Column(String(20), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
