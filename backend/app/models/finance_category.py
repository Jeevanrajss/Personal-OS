"""Finance category model — user-manageable transaction categories."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.db import Base


class FinanceCategory(Base):
    __tablename__ = "finance_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(60), nullable=False, unique=True)
    emoji = Column(String(10), nullable=False, default="💸")
    # "expense" | "income" | "both"
    type = Column(String(10), nullable=False)
    # System categories cannot be deleted (only renamed/re-emojied)
    is_system = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=500)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
