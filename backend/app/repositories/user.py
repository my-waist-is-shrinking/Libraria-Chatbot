from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User


def get_by_email(db: Session, email: str) -> User | None:
    """Find one user by email (None if not found)."""
    stmt = select(User).where(User.email == email)
    return db.scalars(stmt).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    """Find one user by id (None if not found)."""
    return db.get(User, user_id)


def create(db: Session, full_name: str, email: str, hashed_password: str, role: str = "user") -> User:
    """Add a new user to the database."""
    user = User(full_name=full_name, email=email, hashed_password=hashed_password, role=role)
    db.add(user)
    db.flush()      # sends it to the database so user.id gets filled in
    return user

def list_all(db: Session) -> list[User]:
    """Get every user, newest first (for the admin's Users page)."""
    stmt = select(User).order_by(User.created_at.desc())
    return list(db.scalars(stmt).all())