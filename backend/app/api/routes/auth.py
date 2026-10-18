from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserCreate,
    UserRead,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> Any:
    """Log in with email + password. Returns a token and the user's info."""
    user = auth_service.authenticate(db, data.email, data.password)
    if user is None:
        # Same message for wrong email OR wrong password (safer)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong email or password.")
    token = auth_service.create_access_token(user)
    return {"access_token": token, "user": user}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)) -> Any:
    """Student sign-up. Always makes a 'user' account, then logs them in right away."""
    if not data.full_name.strip() or not data.email.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please fill in your name and email.")
    if len(data.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")
    try:
        # role is forced to "user" so nobody can sign up as admin
        user = auth_service.register_user(
            db, UserCreate(full_name=data.full_name, email=data.email, password=data.password, role="user")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))  # email already used
    token = auth_service.create_access_token(user)
    return {"access_token": token, "user": user}


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> Any:
    """Who am I? Needs a token."""
    return user


@router.patch("/me", response_model=UserRead)
def update_me(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),     # must be logged in
    db: Session = Depends(get_db),
) -> Any:
    """Update your own profile (your name)."""
    try:
        return auth_service.update_profile(db, user, data.full_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),     # must be logged in
    db: Session = Depends(get_db),
) -> Any:
    """Change your own password. Needs your current password too."""
    try:
        auth_service.change_password(db, user, data.current_password, data.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "Password changed."}
