"""Data-management endpoints — wipe all user-generated data."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.account import Account
from app.models.budget import Budget
from app.models.finance import Transaction
from app.models.finance_category import FinanceCategory
from app.models.habit import Habit, HabitCheckin
from app.models.journal import Embedding, JournalDay, JournalEntry
from app.models.notification import Notification
from app.models.sms_transaction import SmsTransaction
from app.models.subscription import Subscription

router = APIRouter(prefix="/api/v1/data", tags=["data"])


@router.delete("/wipe")
def wipe_all_data(db: Session = Depends(get_db)):
    """Permanently delete all user-generated data.

    Preserves: settings, seed data (mood_codes, finance_categories that are
    system = True), and user accounts.
    Clears:    transactions, budgets, user finance categories, bank accounts,
               habits, subscriptions, journal, notifications, SMS transactions,
               and all vector embeddings.
    """
    # Children before parents to satisfy FK constraints.
    # (ondelete=CASCADE at the DB level handles checkins/entries when their
    #  parent row is deleted, but bulk DELETE via ORM skips Python-side cascades
    #  so we delete children explicitly first.)
    db.query(Embedding).delete(synchronize_session=False)
    db.query(JournalEntry).delete(synchronize_session=False)
    db.query(JournalDay).delete(synchronize_session=False)
    db.query(HabitCheckin).delete(synchronize_session=False)
    db.query(Habit).delete(synchronize_session=False)
    db.query(Transaction).delete(synchronize_session=False)
    db.query(Budget).delete(synchronize_session=False)
    # Finance categories: delete user-created ones, preserve system categories
    db.query(FinanceCategory).filter(FinanceCategory.is_system.is_(False)).delete(
        synchronize_session=False
    )
    db.query(Account).delete(synchronize_session=False)
    db.query(Subscription).delete(synchronize_session=False)
    db.query(Notification).delete(synchronize_session=False)
    db.query(SmsTransaction).delete(synchronize_session=False)

    # Clear the sqlite-vec virtual table (may not exist in all environments)
    try:
        db.execute(text("DELETE FROM vec_embeddings"))
    except Exception:
        pass

    db.commit()
    return {"ok": True, "message": "All data wiped successfully."}
