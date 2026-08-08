from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from . import auth, crud, models, database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user


def require_credits(current_user: models.User = Depends(get_current_user)):
    """Pass-through dependency (BYOK framework - no credit limits enforced)."""
    return current_user


def require_admin(current_user: models.User = Depends(get_current_user)):
    """Dependency that blocks the request if the user is not in ADMIN_EMAILS."""
    from core.config import ADMIN_EMAILS
    if current_user.email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    key = key.strip()
    if len(key) >= 10:
        return f"{key[:6]}...{key[-4:]}"
    return "••••••••"


def get_user_gemini_api_key(user: models.User) -> str:
    """Retrieve the user's saved Gemini API key from DB, falling back to GEMINI_API_KEY env var if present."""
    import os
    key = (user.gemini_api_key or "").strip() or (os.getenv("GEMINI_API_KEY") or "").strip()
    if not key or key == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Gemini API key is required. Please open Settings and add your Gemini API Key before running simulations."
            ),
        )
    return key

