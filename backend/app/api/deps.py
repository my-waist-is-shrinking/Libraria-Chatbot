from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.repositories import user as user_repo
from app.services import auth as auth_service

# Reads the "Authorization: Bearer <token>" header (also adds the 🔒 Authorize button in /docs)
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Find who is logged in from their token. Stops the request if the token is missing or bad."""
    not_logged_in = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please log in.")
    if creds is None:
        raise not_logged_in
    user_id = auth_service.decode_access_token(creds.credentials)
    if user_id is None:
        raise not_logged_in
    user = user_repo.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise not_logged_in
    return user


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """Like get_current_user, but guests are allowed: no token = None (guest)."""
    if creds is None:                       # no token sent = guest
        return None
    return get_current_user(creds, db)      # token sent = must be valid (expired = "Please log in.")


def require_roles(*roles: str):
    """Only let these roles in. Admin is always allowed (admin can do everything)."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != "admin" and user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this.")
        return user
    return checker