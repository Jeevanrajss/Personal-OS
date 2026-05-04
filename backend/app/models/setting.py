"""Key-value settings store — persists AI provider config in the local DB."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db import Base


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
