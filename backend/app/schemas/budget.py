"""Pydantic schemas for Budget API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BudgetIn(BaseModel):
    year: int | None = None    # null → recurring every year
    month: int | None = None   # null → recurring every month
    category: str | None = Field(default=None, max_length=60)  # null → overall budget
    amount: float = Field(..., gt=0)


class BudgetPatch(BaseModel):
    amount: float | None = Field(default=None, gt=0)


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    year: int | None
    month: int | None
    category: str | None
    amount: float
    created_at: datetime
    updated_at: datetime


class BudgetProgress(BaseModel):
    category: str | None   # None = overall
    budget: float
    spent: float
    pct: float             # 0–100+ (can exceed 100 if over budget)
