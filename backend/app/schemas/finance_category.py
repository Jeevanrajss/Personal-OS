"""Pydantic schemas for finance categories."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator


class FinanceCategoryOut(BaseModel):
    id: str
    name: str
    emoji: str
    type: str
    is_system: bool
    sort_order: int

    model_config = {"from_attributes": True}


class FinanceCategoryIn(BaseModel):
    name: str
    emoji: str = "💸"
    type: Literal["expense", "income", "both"]

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class FinanceCategoryPatch(BaseModel):
    name: str | None = None
    emoji: str | None = None
    sort_order: int | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        return v.strip() if v else v
