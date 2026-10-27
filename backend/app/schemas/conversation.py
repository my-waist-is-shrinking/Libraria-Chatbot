from datetime import datetime

from pydantic import BaseModel


class ConversationRead(BaseModel):
    """One saved chat in the sidebar list (no messages, to keep the list small)."""

    id: int
    title: str | None
    created_at: datetime

    model_config = {"from_attributes": True}   # lets Pydantic read a SQLAlchemy object


class MessageRead(BaseModel):
    """One message of a saved chat."""

    role: str        # "user" or "assistant"
    content: str

    model_config = {"from_attributes": True}