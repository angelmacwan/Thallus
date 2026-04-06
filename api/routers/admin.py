from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from .. import models
from ..deps import get_db, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    is_active: Optional[bool] = None
    credits: Optional[float] = None


# ── Identity check ────────────────────────────────────────────────────────────

@router.get("/me")
def admin_me(current_admin: models.User = Depends(require_admin)):
    """Returns the current admin's email — used by the frontend to verify access."""
    return {"email": current_admin.email}


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    users = db.query(models.User).order_by(models.User.id).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_active": u.is_active,
            "credits": round(u.credits or 0.0, 6),
        }
        for u in users
    ]


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.email is not None:
        user.email = body.email
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.credits is not None:
        user.credits = body.credits
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "is_active": user.is_active, "credits": user.credits}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ── Waitlist Entries ──────────────────────────────────────────────────────────

@router.get("/waitlist-entries")
def list_waitlist_entries(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    entries = db.query(models.WaitlistEntry).order_by(models.WaitlistEntry.id.desc()).all()
    return [
        {
            "id": e.id,
            "email": e.email,
            "ip_address": e.ip_address,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


# ── Unauthorized Register Attempts ────────────────────────────────────────────

@router.get("/unauthorized-attempts")
def list_unauthorized_attempts(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    attempts = (
        db.query(models.UnauthorizedRegisterAttempt)
        .order_by(models.UnauthorizedRegisterAttempt.id.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "email": a.email,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "ip_address": a.ip_address,
        }
        for a in attempts
    ]


# ── Promo Code Usages ─────────────────────────────────────────────────────────

@router.get("/promo-code-usages")
def list_promo_code_usages(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    usages = db.query(models.PromoCodeUsage).order_by(models.PromoCodeUsage.id.desc()).all()
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "email": p.email,
            "code": p.code,
            "redeemed_at": p.redeemed_at.isoformat() if p.redeemed_at else None,
        }
        for p in usages
    ]
