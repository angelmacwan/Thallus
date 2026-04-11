from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
import os
import sys

_secret = os.getenv("SECRET_KEY")
if not _secret:
    print(
        "\n[FATAL] SECRET_KEY environment variable is not set.\n"
        "Set it to a long random string before starting the server.\n"
        "Example: export SECRET_KEY=$(openssl rand -hex 32)\n",
        file=sys.stderr,
    )
    sys.exit(1)

SECRET_KEY: str = _secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
