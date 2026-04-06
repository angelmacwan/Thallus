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


class SessionUpdateRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    rounds: Optional[int] = None


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


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    sessions = db.query(models.Session).order_by(models.Session.id.desc()).all()
    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "user_id": s.user_id,
            "title": s.title,
            "status": s.status,
            "rounds": s.rounds,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.patch("/sessions/{session_id}")
def update_session(
    session_id: int,
    body: SessionUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.title is not None:
        session.title = body.title
    if body.status is not None:
        session.status = body.status
    if body.rounds is not None:
        session.rounds = body.rounds
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "session_id": session.session_id,
        "user_id": session.user_id,
        "title": session.title,
        "status": session.status,
        "rounds": session.rounds,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports")
def list_reports(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    reports = db.query(models.Report).order_by(models.Report.id.desc()).all()
    return [
        {
            "id": r.id,
            "report_id": r.report_id,
            "user_id": r.user_id,
            "session_id": r.session_id,
            "title": r.title,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()


# ── Credit Transactions ───────────────────────────────────────────────────────

@router.get("/transactions")
def list_transactions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    txns = db.query(models.CreditTransaction).order_by(models.CreditTransaction.id.desc()).all()
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "amount_usd": t.amount_usd,
            "description": t.description,
            "session_id": t.session_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in txns
    ]


@router.delete("/transactions/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    txn = db.query(models.CreditTransaction).filter(models.CreditTransaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()


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


@router.delete("/unauthorized-attempts/{attempt_id}", status_code=204)
def delete_unauthorized_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    attempt = (
        db.query(models.UnauthorizedRegisterAttempt)
        .filter(models.UnauthorizedRegisterAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(attempt)
    db.commit()
