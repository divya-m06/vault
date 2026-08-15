from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Request
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..db.database import SessionLocal
from ..models.user import User
from ..schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=13)
bearer_scheme = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_user(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user_in.email.strip().lower()

    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    password_hash = pwd_context.hash(user_in.password)
    user = User(email=normalized_email, password_hash=password_hash)

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_user(request: Request, user_in: UserLogin, db: Session = Depends(get_db)):
    normalized_email = user_in.email.strip().lower()

    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None or not pwd_context.verify(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expires_minutes)
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": expires_at,
    }
    token = jwt.encode(token_payload, settings.secret_key, algorithm="HS256")

    return TokenResponse(access_token=token, token_type="Bearer")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    """
    JWT verification dependency used by protected endpoints.

    Validates the signature and the `exp` claim. Raises HTTP 401 if the token
    is missing, malformed, expired, or references a non-existent user.

    NOTE: This dependency intentionally has no access to vault records, derived
    keys, or master passwords. It only verifies identity.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        # Covers expired tokens (ExpiredSignatureError is a subclass of JWTError)
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's public profile.

    This endpoint exists primarily to provide a testable surface for
    server-side JWT expiry enforcement. No vault data is returned here.
    """
    return current_user
