from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session
from fastapi import Depends
from .. import crud, schemas, auth, models
from ..deps import get_db
from core.config import SERVER, FREE_CREDITS_ON_SIGNUP_USD, CREDITS_PER_USD, ADMIN_EMAILS

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Rate limit constants ──────────────────────────────────────────────────────
_WAITLIST_RATE_LIMIT = 3           # max submissions per IP per window
_WAITLIST_WINDOW_MINUTES = 60      # rolling window in minutes
_OTP_RESEND_COOLDOWN_SECONDS = 60  # minimum seconds between OTP sends
_OTP_MAX_ATTEMPTS = 5              # max wrong guesses before code is locked


# ── Waitlist ──────────────────────────────────────────────────────────────────

@router.post("/waitlist", status_code=201)
def join_waitlist(payload: schemas.WaitlistCreate, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    ip = request.client.host if request.client else None

    # Reject duplicate email
    existing = db.query(models.WaitlistEntry).filter(
        models.WaitlistEntry.email == email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This email is already on the waitlist.")

    # IP rate limiting: count recent entries from same IP within window
    if ip:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=_WAITLIST_WINDOW_MINUTES)
        recent_count = (
            db.query(models.WaitlistEntry)
            .filter(
                models.WaitlistEntry.ip_address == ip,
                models.WaitlistEntry.created_at >= cutoff,
            )
            .count()
        )
        if recent_count >= _WAITLIST_RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )

    entry = models.WaitlistEntry(email=email, ip_address=ip)
    db.add(entry)
    db.commit()
    return {"message": "You are on the list. We will be in touch."}


# ── Send login OTP ────────────────────────────────────────────────────────────
# Works for both existing users (sign-in) and new users (auto-registration).

@router.post("/send-login-otp", status_code=200)
def send_login_otp(payload: schemas.SendLoginOTPRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = crud.get_user_by_email(db, email=email)

    # For brand-new users, enforce the DEV allowlist gate
    if not user:
        if SERVER == "DEV" and email not in ADMIN_EMAILS and not crud.is_email_allowed(db, email):
            crud.log_unauthorized_register(db, email=email)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Thallus is currently invite-only. "
                    "Your email address is not on the access list. "
                    "You can request access by joining the waitlist on our homepage."
                ),
            )

    # Enforce resend cooldown
    last = crud.get_last_otp(db, email=email, purpose="login")
    if last:
        elapsed = (datetime.utcnow() - last.created_at).total_seconds()
        if elapsed < _OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(_OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait} seconds before requesting another code.",
            )

    otp = crud.create_otp(db, email=email, purpose="login")

    from ..email import send_otp_email
    send_otp_email(to=email, code=otp.code, purpose="login")

    return {"message": "Login code sent. Check your email."}


# ── Verify login OTP ──────────────────────────────────────────────────────────

@router.post("/verify-login-otp")
def verify_login_otp(payload: schemas.VerifyLoginOTPRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    verified = crud.verify_otp(db, email=email, code=payload.otp.strip(), purpose="login")
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired code. Please try again.",
        )

    # Auto-create account on first login
    user = crud.get_user_by_email(db, email=email)
    if not user:
        user = crud.create_user_passwordless(db, email=email)
        # Log welcome-credits transaction
        from ..models import CreditTransaction
        tx = CreditTransaction(
            user_id=user.id,
            amount_usd=FREE_CREDITS_ON_SIGNUP_USD,
            description=f"Welcome credits ({FREE_CREDITS_ON_SIGNUP_USD * CREDITS_PER_USD:.0f} credits)",
        )
        db.add(tx)
        db.commit()
        crud.log_action(db, user.id, "register")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact support if you believe this is an error.",
        )

    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    crud.log_action(db, user.id, "login")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
    }
