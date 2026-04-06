from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import crud, schemas, auth, models
from ..deps import get_db, get_current_user
from core.config import SERVER, ALLOWED_EMAILS, FREE_CREDITS_ON_SIGNUP_USD, CREDITS_PER_USD

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Waitlist ──────────────────────────────────────────────────────────────────
_WAITLIST_RATE_LIMIT = 3          # max submissions per IP per window
_WAITLIST_WINDOW_MINUTES = 60     # rolling window in minutes


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
        from datetime import datetime, timezone
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

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if SERVER == "DEV" and user.email.lower() not in ALLOWED_EMAILS:
        crud.log_unauthorized_register(db, email=user.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not authorised to create an account.",
        )
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = crud.create_user(db=db, user=user)
    # Log the welcome-credits transaction
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
