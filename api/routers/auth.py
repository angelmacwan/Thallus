from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import crud, schemas, auth, models
from ..deps import get_db, get_current_user
from core.config import SERVER, ALLOWED_EMAILS, FREE_CREDITS_ON_SIGNUP_USD, CREDITS_PER_USD

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Rate limit constants ──────────────────────────────────────────────────────
_WAITLIST_RATE_LIMIT = 3          # max submissions per IP per window
_WAITLIST_WINDOW_MINUTES = 60     # rolling window in minutes
_OTP_RESEND_COOLDOWN_SECONDS = 60 # minimum seconds between OTP sends
_OTP_MAX_ATTEMPTS = 5             # max wrong guesses before code is locked


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


# ── OTP: send signup verification code ───────────────────────────────────────

@router.post("/send-signup-otp", status_code=200)
def send_signup_otp(payload: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    # Reject if email is already registered
    if crud.get_user_by_email(db, email=email):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Enforce 60-second resend cooldown
    last = crud.get_last_otp(db, email=email, purpose="signup")
    if last:
        elapsed = (datetime.utcnow() - last.created_at).total_seconds()
        if elapsed < _OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(_OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait} seconds before requesting another code.",
            )

    otp = crud.create_otp(db, email=email, purpose="signup")

    from ..email import send_otp_email
    send_otp_email(to=email, code=otp.code, purpose="signup")

    return {"message": "Verification code sent. Check your email."}


# ── Register (requires valid OTP) ─────────────────────────────────────────────

@router.post("/register", response_model=schemas.UserResponse)
def register(payload: schemas.VerifySignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    # Verify OTP first
    verified = crud.verify_otp(db, email=email, code=payload.otp.strip(), purpose="signup")
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    # DEV-mode gate
    if SERVER == "DEV" and email not in ALLOWED_EMAILS:
        crud.log_unauthorized_register(db, email=email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not authorised to create an account.",
        )

    if crud.get_user_by_email(db, email=email):
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Build a UserCreate-compatible object with the normalised email
    user_create = schemas.UserCreate(email=email, password=payload.password)
    new_user = crud.create_user(db=db, user=user_create)

    # Log welcome-credits transaction
    from ..models import CreditTransaction
    tx = CreditTransaction(
        user_id=new_user.id,
        amount_usd=FREE_CREDITS_ON_SIGNUP_USD,
        description=f"Welcome credits ({FREE_CREDITS_ON_SIGNUP_USD * CREDITS_PER_USD:.0f} credits)",
    )
    db.add(tx)
    db.commit()
    crud.log_action(db, new_user.id, "register")
    return new_user


# ── OTP: send password-reset code ─────────────────────────────────────────────

@router.post("/send-reset-otp", status_code=200)
def send_reset_otp(payload: schemas.SendResetOTPRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    # Always return the same message to prevent user-enumeration
    user = crud.get_user_by_email(db, email=email)
    if not user:
        return {"message": "If that email is registered, a reset code has been sent."}

    # Enforce 60-second resend cooldown
    last = crud.get_last_otp(db, email=email, purpose="password_reset")
    if last:
        elapsed = (datetime.utcnow() - last.created_at).total_seconds()
        if elapsed < _OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(_OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait} seconds before requesting another code.",
            )

    otp = crud.create_otp(db, email=email, purpose="password_reset")

    from ..email import send_otp_email
    send_otp_email(to=email, code=otp.code, purpose="password_reset")

    return {"message": "If that email is registered, a reset code has been sent."}


# ── Reset password ────────────────────────────────────────────────────────────

@router.post("/reset-password", status_code=200)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    verified = crud.verify_otp(db, email=email, code=payload.otp.strip(), purpose="password_reset")
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    user.hashed_password = auth.get_password_hash(payload.new_password)
    db.commit()
    crud.log_action(db, user.id, "password_reset")
    return {"message": "Password updated successfully. You can now sign in."}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    crud.log_action(db, user.id, "login")
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id, "email": user.email}

