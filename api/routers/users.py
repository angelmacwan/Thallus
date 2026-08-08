from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, crud
from ..deps import get_db, get_current_user, mask_api_key
from core.config import FREE_CREDITS_ON_SIGNUP_USD, CREDITS_PER_USD

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/me", response_model=schemas.CreditsResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    has_key = bool(current_user.gemini_api_key and current_user.gemini_api_key.strip())
    return schemas.CreditsResponse(
        email=current_user.email,
        credits_usd=0.0,
        display_credits=0,
        initial_credits=0,
        has_gemini_api_key=has_key,
        masked_gemini_api_key=mask_api_key(current_user.gemini_api_key) if has_key else None,
    )


@router.put("/api-key", response_model=schemas.ApiKeyUpdateResponse)
def update_api_key(
    body: schemas.ApiKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    key = body.get_key()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
    
    current_user.gemini_api_key = key
    db.commit()
    db.refresh(current_user)

    crud.log_action(db, current_user.id, "update_gemini_api_key", "Updated Gemini API key")

    return schemas.ApiKeyUpdateResponse(
        success=True,
        message="Gemini API Key updated successfully.",
        has_gemini_api_key=True,
        masked_gemini_api_key=mask_api_key(key),
    )


@router.delete("/api-key", response_model=schemas.ApiKeyUpdateResponse)
def delete_api_key(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.gemini_api_key = None
    db.commit()
    db.refresh(current_user)

    crud.log_action(db, current_user.id, "delete_gemini_api_key", "Removed Gemini API key")

    return schemas.ApiKeyUpdateResponse(
        success=True,
        message="Gemini API Key removed.",
        has_gemini_api_key=False,
        masked_gemini_api_key=None,
    )
