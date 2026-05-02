"""Accounts router — CRUD for bank/card accounts + card-benefit tips."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.account import Account
from app.schemas.account import (
    CARD_BENEFITS_DB,
    AccountIn,
    AccountOut,
    AccountPatch,
    CardTipRequest,
    CardTipResponse,
)

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=list[AccountOut])
def list_accounts(include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(Account)
    if not include_inactive:
        q = q.filter(Account.is_active.is_(True))
    return q.order_by(Account.created_at.asc()).all()


@router.post("", response_model=AccountOut, status_code=201)
def create_account(payload: AccountIn, db: Session = Depends(get_db)):
    acct = Account(**payload.model_dump())
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.get("/card-benefits/{card_name}")
def get_card_benefits(card_name: str):
    """Return static known benefits for a named credit card.

    When online fetch is enabled, this endpoint will hit the card issuer's
    API and return live data. Until then it uses the static CARD_BENEFITS_DB.
    """
    # Exact match first
    data = CARD_BENEFITS_DB.get(card_name)
    if data is None:
        # Fuzzy prefix/substring match
        for k, v in CARD_BENEFITS_DB.items():
            if card_name.lower() in k.lower() or k.lower() in card_name.lower():
                data = v
                break
    if data is None:
        return {"card_name": card_name, "perks": [], "cashback": {}, "source": "unknown"}
    return {"card_name": card_name, **data, "source": "static"}


@router.get("/{acct_id}", response_model=AccountOut)
def get_account(acct_id: str, db: Session = Depends(get_db)):
    acct = db.get(Account, acct_id)
    if acct is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return acct


@router.patch("/{acct_id}", response_model=AccountOut)
def update_account(acct_id: str, patch: AccountPatch, db: Session = Depends(get_db)):
    acct = db.get(Account, acct_id)
    if acct is None:
        raise HTTPException(status_code=404, detail="Account not found")
    for k, v in patch.model_dump(exclude_unset=True).items():
        setattr(acct, k, v)
    db.commit()
    db.refresh(acct)
    return acct


@router.delete("/{acct_id}", status_code=204)
def delete_account(acct_id: str, db: Session = Depends(get_db)):
    acct = db.get(Account, acct_id)
    if acct is None:
        raise HTTPException(status_code=404, detail="Account not found")
    # Soft-delete — keep history intact
    acct.is_active = False  # type: ignore[assignment]
    db.commit()


# ---------------------------------------------------------------------------
# AI card-tip
# ---------------------------------------------------------------------------
@router.post("/card-tip", response_model=CardTipResponse)
def card_tip(req: CardTipRequest, db: Session = Depends(get_db)):
    """Given a transaction, check whether a registered credit card would
    earn better rewards/cashback for that category."""
    credit_cards = (
        db.query(Account)
        .filter(Account.is_active.is_(True), Account.type == "credit_card")
        .all()
    )

    def _get_rate(card: Account) -> float:
        """Effective cashback % for req.category on this card."""
        static = CARD_BENEFITS_DB.get(card.name)
        if static:
            return float(static.get("cashback", {}).get(req.category, 1.0))
        if card.benefits_json:
            try:
                stored = json.loads(card.benefits_json)
                return float(stored.get("cashback", {}).get(req.category, 1.0))
            except Exception:
                pass
        return 1.0  # baseline: 1 reward point per ₹100 on most cards

    def _name_matches(card: Account, name: str) -> bool:
        n = name.lower().strip()
        return card.name.lower() == n or n in card.name.lower() or card.name.lower() in n

    # Determine what cashback rate the used account earns
    used_card = next((c for c in credit_cards if _name_matches(c, req.account)), None)
    current_rate = _get_rate(used_card) if used_card else 0.0

    # Find the best registered card for this category (excluding the used one)
    best_card: Account | None = None
    best_rate = current_rate

    for c in credit_cards:
        if _name_matches(c, req.account):
            continue
        rate = _get_rate(c)
        if rate > best_rate:
            best_rate = rate
            best_card = c

    if best_card is None:
        return CardTipResponse(
            tip=None, better_card=None,
            cashback_rate=None, current_rate=current_rate,
        )

    saving = round((best_rate - current_rate) / 100 * req.amount, 2)
    account_label = req.account or "the account you used"
    tip = (
        f"💡 Next time, use your {best_card.name} for {req.category} — "
        f"it earns {best_rate:.0f}% cashback vs {current_rate:.0f}% on {account_label}. "
        f"On ₹{req.amount:,.0f} that's ₹{saving:,.0f} more back."
    )

    return CardTipResponse(
        tip=tip,
        better_card=best_card.name,
        cashback_rate=best_rate,
        current_rate=current_rate,
    )
