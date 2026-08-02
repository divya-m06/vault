from datetime import datetime, timedelta, timezone

from jose import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..db.database import SessionLocal
from ..models.user import User
from ..schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
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
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
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
