from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.models import User
from app.db.session import get_db
from app.schemas.user import PasswordReset, RoleUpdate, StatusUpdate, UserCreate, UserRead
from app.services import admin as admin_service
from app.services import auth as auth_service

# Every door here is admin-only (require_roles checks the token + role)
router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_roles("admin")


def handle_errors(action):
    """Run an admin action and turn its errors into messages the app can show."""
    try:
        return action()
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))     # user doesn't exist
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))   # not allowed / bad input


@router.get("/users", response_model=list[UserRead])
def read_users(db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> Any:
    """List every account."""
    return admin_service.list_users(db)


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> Any:
    """Make a new account with any role (e.g. a librarian)."""
    if len(data.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")
    return handle_errors(lambda: auth_service.register_user(db, data))


@router.patch("/users/{user_id}/role", response_model=UserRead)
def update_role(user_id: int, data: RoleUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> Any:
    """Change someone's role."""
    return handle_errors(lambda: admin_service.change_role(db, admin, user_id, data.role))


@router.patch("/users/{user_id}/status", response_model=UserRead)
def update_status(user_id: int, data: StatusUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> Any:
    """Activate or deactivate an account."""
    return handle_errors(lambda: admin_service.set_active(db, admin, user_id, data.is_active))


@router.post("/users/{user_id}/reset-password", response_model=UserRead)
def reset_password(user_id: int, data: PasswordReset, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> Any:
    """Give someone a new password."""
    return handle_errors(lambda: admin_service.reset_password(db, user_id, data.new_password))