from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.repositories import user as user_repo
from app.schemas.user import UserCreate


# ===== PASSWORDS (bcrypt) =====

def hash_password(password: str) -> str:
    """Scramble a password. It can never be turned back into the real one."""
    # bcrypt only reads the first 72 bytes, so we cut it there to avoid an error
    hashed = bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Scramble what the person typed the same way and check if it matches."""
    return bcrypt.checkpw(password.encode("utf-8")[:72], hashed_password.encode("utf-8"))


# ===== TOKENS (JWT = the login "ticket") =====

def create_access_token(user: User) -> str:
    """Make a signed ticket that says who this user is and when it expires."""
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user.id), "role": user.role, "exp": expires}  # "sub" = whose ticket
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """Read a ticket. Returns the user id, or None if it is fake or expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


# ===== LOGIN + ACCOUNTS =====

def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user if email + password are correct and the account is active."""
    user = user_repo.get_by_email(db, email.strip().lower())
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_profile(db: Session, user: User, full_name: str) -> User:
    """Change a logged-in user's display name."""
    name = full_name.strip()
    if not name:
        raise ValueError("Name can't be empty.")
    user.full_name = name    # saved when the request finishes (get_db commits)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    """Change a logged-in user's password. They must know the current one first."""
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Your current password is wrong.")
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters.")
    if verify_password(new_password, user.hashed_password):
        raise ValueError("New password must be different from the current one.")
    user.hashed_password = hash_password(new_password)  # saved when the request finishes (get_db commits)


def register_user(db: Session, data: UserCreate) -> User:
    """Make a new account (password is scrambled before saving)."""
    email = data.email.strip().lower()      # same email format every time
    if user_repo.get_by_email(db, email):
        raise ValueError("That email is already used.")
    return user_repo.create(
        db,
        full_name=data.full_name.strip(),
        email=email,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
