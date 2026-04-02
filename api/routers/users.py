from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_db, get_current_user
from core.config import FREE_CREDITS_ON_SIGNUP_USD, CREDITS_PER_USD

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/me", response_model=schemas.CreditsResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    credits_usd = current_user.credits if current_user.credits is not None else 0.0
    return schemas.CreditsResponse(
        email=current_user.email,
        credits_usd=round(credits_usd, 6),
        display_credits=round(credits_usd * CREDITS_PER_USD),
        initial_credits=round(FREE_CREDITS_ON_SIGNUP_USD * CREDITS_PER_USD),
    )
