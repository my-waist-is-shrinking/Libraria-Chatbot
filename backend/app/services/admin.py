from sqlalchemy.orm import Session

from app.db.models import User
from app.repositories import user as user_repo
from app.services.auth import hash_password

ROLES = ("user", "librarian", "admin")


def list_users(db: Session) -> list[User]:
    """Every account, newest first."""
    return user_repo.list_all(db)


def get_user_or_error(db: Session, user_id: int) -> User:
    """Find a user by id, or stop with an error if they don't exist."""
    user = user_repo.get_by_id(db, user_id)
    if user is None:
        raise LookupError("User not found.")
    return user


def change_role(db: Session, admin: User, user_id: int, role: str) -> User:
    """Make someone a user, librarian, or admin."""
    if role not in ROLES:
        raise ValueError("Role must be user, librarian, or admin.")
    user = get_user_or_error(db, user_id)
    if user.id == admin.id and role != "admin":
        # stops you from locking yourself out of the admin dashboard
        raise ValueError("You can't remove your own admin role.")
    user.role = role
    return user


def set_active(db: Session, admin: User, user_id: int, is_active: bool) -> User:
    """Deactivate (can't log in) or activate an account."""
    user = get_user_or_error(db, user_id)
    if user.id == admin.id and not is_active:
        raise ValueError("You can't deactivate your own account.")
    user.is_active = is_active
    return user


def reset_password(db: Session, user_id: int, new_password: str) -> User:
    """Give someone a new password (for when they forget theirs)."""
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters.")
    user = get_user_or_error(db, user_id)
    user.hashed_password = hash_password(new_password)
    return user