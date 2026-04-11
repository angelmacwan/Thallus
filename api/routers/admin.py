from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr

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


# ── Promo Codes ───────────────────────────────────────────────────────────────

class PromoCodeCreateRequest(BaseModel):
    code: str
    val: int      # display credits
    users: int    # max redemptions


class PromoCodeUpdateRequest(BaseModel):
    val: Optional[int] = None
    users: Optional[int] = None


@router.get("/promo-codes")
def list_promo_codes(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    codes = db.query(models.PromoCode).order_by(models.PromoCode.id).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "val": c.val,
            "users": c.users,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in codes
    ]


@router.post("/promo-codes", status_code=201)
def create_promo_code(
    body: PromoCodeCreateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if db.query(models.PromoCode).filter(models.PromoCode.code == body.code.strip()).first():
        raise HTTPException(status_code=409, detail="A promo code with that name already exists.")
    promo = models.PromoCode(code=body.code.strip().upper(), val=body.val, users=body.users)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return {"id": promo.id, "code": promo.code, "val": promo.val, "users": promo.users}


@router.patch("/promo-codes/{promo_id}")
def update_promo_code(
    promo_id: int,
    body: PromoCodeUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    promo = db.query(models.PromoCode).filter(models.PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found.")
    if body.val is not None:
        promo.val = body.val
    if body.users is not None:
        promo.users = body.users
    db.commit()
    db.refresh(promo)
    return {"id": promo.id, "code": promo.code, "val": promo.val, "users": promo.users}


@router.delete("/promo-codes/{promo_id}", status_code=204)
def delete_promo_code(
    promo_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    promo = db.query(models.PromoCode).filter(models.PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found.")
    db.delete(promo)
    db.commit()


# ── Allow List ────────────────────────────────────────────────────────────────

class AllowEmailRequest(BaseModel):
    email: EmailStr


@router.get("/allowed-emails")
def list_allowed_emails(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    entries = db.query(models.AllowedEmail).order_by(models.AllowedEmail.id).all()
    return [
        {
            "id": e.id,
            "email": e.email,
            "promoted_from_waitlist": e.promoted_from_waitlist,
            "added_at": e.added_at.isoformat() if e.added_at else None,
        }
        for e in entries
    ]


@router.post("/allowed-emails", status_code=201)
def add_allowed_email(
    body: AllowEmailRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Directly add an email to the allow list (without promoting from waitlist)."""
    email = body.email.strip().lower()
    if db.query(models.AllowedEmail).filter(models.AllowedEmail.email == email).first():
        raise HTTPException(status_code=409, detail="Email is already on the allow list.")
    entry = models.AllowedEmail(email=email, promoted_from_waitlist=False)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "email": entry.email, "promoted_from_waitlist": entry.promoted_from_waitlist}


@router.delete("/allowed-emails/{allowed_email_id}", status_code=204)
def delete_allowed_email(
    allowed_email_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    entry = db.query(models.AllowedEmail).filter(models.AllowedEmail.id == allowed_email_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Allowed email not found.")
    db.delete(entry)
    db.commit()


@router.post("/allowed-emails/promote/{waitlist_id}", status_code=200)
def promote_waitlist_entry(
    waitlist_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Promote a waitlist entry to the allow list and send a welcome email."""
    entry = db.query(models.WaitlistEntry).filter(models.WaitlistEntry.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found.")

    email = entry.email.strip().lower()

    # Idempotent — do not error if already on the list
    existing = db.query(models.AllowedEmail).filter(models.AllowedEmail.email == email).first()
    if not existing:
        allowed = models.AllowedEmail(email=email, promoted_from_waitlist=True)
        db.add(allowed)
        db.commit()
        db.refresh(allowed)
    else:
        allowed = existing

    # Send welcome email (best-effort — don't fail the request if email errors)
    try:
        from ..email import send_allowlist_welcome_email
        send_allowlist_welcome_email(to=email)
    except Exception:
        pass  # log but don't surface to admin

    # Remove from waitlist now that they're on the allow list
    db.delete(entry)
    db.commit()

    return {
        "id": allowed.id,
        "email": allowed.email,
        "promoted_from_waitlist": allowed.promoted_from_waitlist,
        "email_sent": True,
    }


@router.delete("/allowed-emails/{allowed_id}", status_code=204)
def remove_allowed_email(
    allowed_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    entry = db.query(models.AllowedEmail).filter(models.AllowedEmail.id == allowed_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Allowed email not found.")
    db.delete(entry)
    db.commit()
