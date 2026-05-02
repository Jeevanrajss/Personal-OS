"""Pydantic schemas for Account API + static card-benefits database.

The CARD_BENEFITS_DB is populated from public knowledge of common Indian
credit cards. When online connectivity is added, a background task can
refresh each card's entry via the card issuer's API and store the result
back in benefits_json on the Account row.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AccountType = Literal["savings", "credit_card", "debit_card", "wallet", "upi", "cash"]

ACCOUNT_TYPE_LABELS: dict[str, str] = {
    "savings": "Savings",
    "credit_card": "Credit Card",
    "debit_card": "Debit Card",
    "wallet": "Wallet",
    "upi": "UPI",
    "cash": "Cash",
}

# ---------------------------------------------------------------------------
# Static card-benefits database
# cashback values are % cashback (or equivalent reward value) per category.
# A base rate of 1.0 is assumed for all cards on any unlisted category.
# ---------------------------------------------------------------------------
CARD_BENEFITS_DB: dict[str, dict] = {
    "HDFC Credit Card": {
        "perks": [
            "5% cashback on dining & food delivery",
            "10% cashback on travel bookings",
            "2% cashback on online shopping",
            "1% cashback on all other spends",
        ],
        "cashback": {"Food & Dining": 5.0, "Travel": 10.0, "Shopping": 2.0},
        "annual_fee": 500,
    },
    "ICICI Credit Card": {
        "perks": [
            "5% cashback on groceries & shopping",
            "3% cashback on dining",
            "2% fuel surcharge waiver",
        ],
        "cashback": {"Shopping": 5.0, "Food & Dining": 3.0},
        "annual_fee": 500,
    },
    "SBI Credit Card": {
        "perks": [
            "4x reward points on dining & movies",
            "5x reward points on groceries",
            "1% fuel surcharge waiver",
        ],
        "cashback": {"Food & Dining": 4.0, "Entertainment": 4.0, "Shopping": 5.0},
        "annual_fee": 499,
    },
    "IDFC First Credit Card": {
        "perks": [
            "10x reward points on online shopping",
            "3% cashback on utility bills",
            "1% fuel surcharge waiver",
            "Lifetime free — no annual fee",
        ],
        "cashback": {"Shopping": 5.0, "Utilities": 3.0},
        "annual_fee": 0,
    },
    "Axis Credit Card": {
        "perks": [
            "5% cashback on food delivery (Swiggy/Zomato)",
            "2% on all online spends",
            "EDGE miles on travel bookings",
        ],
        "cashback": {"Food & Dining": 5.0, "Shopping": 2.0, "Travel": 5.0},
        "annual_fee": 500,
    },
    "Kotak Credit Card": {
        "perks": [
            "5% cashback on groceries & online shopping",
            "2% on all online transactions",
            "Airport lounge access (2/quarter)",
        ],
        "cashback": {"Shopping": 5.0, "Food & Dining": 2.0},
        "annual_fee": 500,
    },
    "Yes Bank Credit Card": {
        "perks": [
            "3x reward points on dining",
            "2x reward points on shopping",
            "Airport lounge access",
        ],
        "cashback": {"Food & Dining": 3.0, "Shopping": 2.0},
        "annual_fee": 399,
    },
    "AmEx Credit Card": {
        "perks": [
            "5x Membership Rewards on dining & shopping",
            "3x on travel bookings",
            "Premium airport lounge access (unlimited)",
            "Welcome bonus points on first spend",
        ],
        "cashback": {"Food & Dining": 5.0, "Shopping": 5.0, "Travel": 3.0},
        "annual_fee": 1500,
    },
    "IndusInd Credit Card": {
        "perks": [
            "2.5x reward points on weekend dining",
            "1.5x on all other spends",
            "Movie ticket discounts (BookMyShow)",
        ],
        "cashback": {"Food & Dining": 3.0, "Entertainment": 3.0},
        "annual_fee": 999,
    },
}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class AccountIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType = "savings"
    bank: str | None = Field(default=None, max_length=60)
    last4: str | None = Field(default=None, max_length=4)
    credit_limit: float | None = None
    benefits_json: str | None = None
    color: str | None = None


class AccountPatch(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    type: AccountType | None = None
    bank: str | None = None
    last4: str | None = None
    credit_limit: float | None = None
    benefits_json: str | None = None
    color: str | None = None
    is_active: bool | None = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    bank: str | None
    last4: str | None
    credit_limit: float | None
    benefits_json: str | None
    color: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CardTipRequest(BaseModel):
    category: str
    account: str   # account name used for the transaction
    amount: float


class CardTipResponse(BaseModel):
    tip: str | None
    better_card: str | None
    cashback_rate: float | None
    current_rate: float | None
