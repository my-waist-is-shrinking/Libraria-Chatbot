from typing import Literal

from pydantic import BaseModel, ConfigDict

# The only roles allowed (same as the CHECK in schema.sql)
Role = Literal["user", "librarian", "admin"]


class LoginRequest(BaseModel):
    """What the login form sends."""
    email: str
    password: str


class RegisterRequest(BaseModel):
    """What the Sign up form sends. No role here: sign-ups are always students."""
    full_name: str
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    """What the Profile page sends. Only the name can be changed (email is your login)."""
    full_name: str


class ChangePasswordRequest(BaseModel):
    """What the Change password form sends (user must be logged in)."""
    current_password: str
    new_password: str


class UserCreate(BaseModel):
    """Data needed to make a new account (admin uses this later)."""
    full_name: str
    email: str
    password: str           # plain password, scrambled before saving
    role: Role = "user"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # can read from database objects

    id: int
    full_name: str
    email: str
    role: Role
    is_active: bool
    # hashed_password is NOT included: never send it to the frontend


class TokenResponse(BaseModel):
    """What the backend sends back after a successful login."""
    access_token: str       # the login "ticket"
    token_type: str = "bearer"
    user: UserRead

# ===== ADMIN: manage users =====

class RoleUpdate(BaseModel):
    """Admin changes someone's role."""
    role: Role


class StatusUpdate(BaseModel):
    """Admin activates (True) or deactivates (False) an account."""
    is_active: bool


class PasswordReset(BaseModel):
    """Admin gives someone a new password."""
    new_password: str