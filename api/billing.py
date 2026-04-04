"""
Billing service — credit calculation and deduction.

All monetary values are stored as USD floats internally.
The UI displays credits as  round(usd * CREDITS_PER_USD).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session as DBSession

from core.config import (
    GEMINI_INPUT_PRICE_PER_1M_USD,
    GEMINI_OUTPUT_PRICE_PER_1M_USD,
    GEMINI_GROUNDING_PRICE_PER_1K_USD,
    PROFIT_MULTIPLIER,
    CREDITS_PER_USD,
)
from core.usage import UsageSummary  # noqa: F401 — re-exported for callers

__all__ = ["UsageSummary", "calculate_cost_usd", "usd_to_display_credits", "deduct_credits", "grant_signup_credits"]


def calculate_cost_usd(usage: UsageSummary) -> float:
    """Return the user-facing cost in USD after applying PROFIT_MULTIPLIER."""
    input_cost = (usage.input_tokens / 1_000_000) * GEMINI_INPUT_PRICE_PER_1M_USD
    output_cost = (usage.output_tokens / 1_000_000) * GEMINI_OUTPUT_PRICE_PER_1M_USD
    grounding_cost = (usage.grounded_prompts / 1_000) * GEMINI_GROUNDING_PRICE_PER_1K_USD
    raw_cost = input_cost + output_cost + grounding_cost
    return round(raw_cost * PROFIT_MULTIPLIER, 6)


def usd_to_display_credits(usd: float) -> int:
    """Convert an internal USD float to the integer credit count shown in the UI."""
    return round(usd * CREDITS_PER_USD)


def deduct_credits(
    db: DBSession,
    user_id: int,
    usage: UsageSummary,
    description: str,
    session_db_id: Optional[int] = None,
) -> float:
    """
    Deduct calculated cost from user.credits and record a CreditTransaction.
    Returns the amount deducted (in USD). Clamps to available balance.
    """
    from .models import User, CreditTransaction

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return 0.0

    cost = calculate_cost_usd(usage)
    # Never go below zero
    actual_deduction = min(cost, max(user.credits, 0.0))
    user.credits = max(0.0, user.credits - cost)

    tx = CreditTransaction(
        user_id=user_id,
        amount_usd=-actual_deduction,
        description=description,
        session_id=session_db_id,
    )
    db.add(tx)
    db.commit()
    return actual_deduction


def grant_signup_credits(db: DBSession, user_id: int) -> None:
    """Credit a new user with FREE_CREDITS_ON_SIGNUP_USD and log the transaction."""
    from .models import User, CreditTransaction
    from core.config import FREE_CREDITS_ON_SIGNUP_USD

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    user.credits = FREE_CREDITS_ON_SIGNUP_USD
    tx = CreditTransaction(
        user_id=user_id,
        amount_usd=FREE_CREDITS_ON_SIGNUP_USD,
        description="Welcome credits",
    )
    db.add(tx)
    db.commit()
