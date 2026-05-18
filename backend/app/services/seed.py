"""Seed data — mood palette (12 codes) and initial tag vocabulary.

Runs idempotently from init_db(). Safe to re-run; uses `INSERT OR IGNORE`-style
semantics via SQLAlchemy's merge pattern.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.journal import MoodCode, Tag

# ---------------------------------------------------------------------------
# The 12-mood palette.
# Grouped by energy × valence so analytics have clean buckets later.
# valence: +2 strong positive, +1 positive, -1 negative, -2 strong negative.
# ---------------------------------------------------------------------------
MOOD_PALETTE: list[dict] = [
    {"code": "grateful",    "label": "Grateful",    "emoji": "🙏",  "valence":  2, "sort_order":  1},
    {"code": "content",     "label": "Content",     "emoji": "😊",  "valence":  2, "sort_order":  2},
    {"code": "motivated",   "label": "Motivated",   "emoji": "⚡",  "valence":  1, "sort_order":  3},
    {"code": "calm",        "label": "Calm",        "emoji": "😌",  "valence":  1, "sort_order":  4},
    {"code": "focused",     "label": "Focused",     "emoji": "🎯",  "valence":  1, "sort_order":  5},
    {"code": "curious",     "label": "Curious",     "emoji": "🤔",  "valence":  1, "sort_order":  6},
    {"code": "tired",       "label": "Tired",       "emoji": "😴",  "valence": -1, "sort_order":  7},
    {"code": "sad",         "label": "Sad",         "emoji": "😢",  "valence": -1, "sort_order":  8},
    {"code": "anxious",     "label": "Anxious",     "emoji": "😰",  "valence": -1, "sort_order":  9},
    {"code": "drained",     "label": "Drained",     "emoji": "🪫",  "valence": -2, "sort_order": 10},
    {"code": "overwhelmed", "label": "Overwhelmed", "emoji": "😵",  "valence": -2, "sort_order": 11},
    {"code": "angry",       "label": "Angry",       "emoji": "😡",  "valence": -2, "sort_order": 12},
]

# Initial tag vocabulary.
SEED_TAGS: list[str] = [
    "work",
    "family",
    "health",
    "money",
    "win",
    "lesson",
    "gratitude",
    "grief",
]


SEED_FINANCE_CATEGORIES = [
    # Expense
    {"name": "Food & Dining",  "emoji": "🍽️", "type": "expense", "is_system": True, "sort_order": 10},
    {"name": "Transport",      "emoji": "🚗",  "type": "expense", "is_system": True, "sort_order": 20},
    {"name": "Shopping",       "emoji": "🛒",  "type": "expense", "is_system": True, "sort_order": 30},
    {"name": "Healthcare",     "emoji": "🏥",  "type": "expense", "is_system": True, "sort_order": 40},
    {"name": "Entertainment",  "emoji": "🎬",  "type": "expense", "is_system": True, "sort_order": 50},
    {"name": "Housing",        "emoji": "🏠",  "type": "expense", "is_system": True, "sort_order": 60},
    {"name": "Utilities",      "emoji": "💡",  "type": "expense", "is_system": True, "sort_order": 70},
    {"name": "Education",      "emoji": "📚",  "type": "expense", "is_system": True, "sort_order": 80},
    {"name": "Fitness",        "emoji": "💪",  "type": "expense", "is_system": True, "sort_order": 90},
    {"name": "Travel",         "emoji": "✈️",  "type": "expense", "is_system": True, "sort_order": 100},
    {"name": "Subscriptions",  "emoji": "💳",  "type": "expense", "is_system": True, "sort_order": 110},
    {"name": "Other",          "emoji": "💸",  "type": "expense", "is_system": True, "sort_order": 990},
    # Both (expense + income)
    {"name": "Splits",         "emoji": "🤝",  "type": "both",    "is_system": True, "sort_order": 120},
    # Income
    {"name": "Salary",         "emoji": "💼",  "type": "income",  "is_system": True, "sort_order": 200},
    {"name": "Freelance",      "emoji": "💰",  "type": "income",  "is_system": True, "sort_order": 210},
    {"name": "Investment",     "emoji": "📈",  "type": "income",  "is_system": True, "sort_order": 220},
    {"name": "Gift",           "emoji": "🎁",  "type": "income",  "is_system": True, "sort_order": 230},
    {"name": "Other Income",   "emoji": "💵",  "type": "income",  "is_system": True, "sort_order": 999},
]


def seed_all(db: Session) -> None:
    """Idempotent seed — only inserts missing rows."""
    _seed_moods(db)
    _seed_tags(db)
    _seed_finance_categories(db)
    db.commit()


def _seed_moods(db: Session) -> None:
    existing = {m.code for m in db.query(MoodCode).all()}
    for m in MOOD_PALETTE:
        if m["code"] not in existing:
            db.add(MoodCode(**m))


def _seed_tags(db: Session) -> None:
    existing = {t.name for t in db.query(Tag).filter(Tag.seeded.is_(True)).all()}
    for name in SEED_TAGS:
        if name not in existing:
            db.add(Tag(name=name, seeded=True))


def _seed_finance_categories(db: Session) -> None:
    from app.models.finance_category import FinanceCategory
    existing = {c.name for c in db.query(FinanceCategory).all()}
    for cat in SEED_FINANCE_CATEGORIES:
        if cat["name"] not in existing:
            db.add(FinanceCategory(**cat))


def mood_valence_map(db: Session) -> dict[str, int]:
    """Lookup used for calendar heatmap coloring."""
    return {m.code: m.valence for m in db.query(MoodCode).all()}
