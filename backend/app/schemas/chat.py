from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.book import BookRead


class HistoryMessage(BaseModel):
    """One earlier message in the conversation."""

    role: Literal["user", "assistant"]   # who said it
    content: str


class ChatRequest(BaseModel):
    """What the frontend sends."""

    message: str = Field(min_length=1, max_length=1000)
    history: list[HistoryMessage] = []   # earlier messages (empty for a new chat)
    conversation_id: int | None = None   # saved chat to add to (None = new chat, or a guest)


class ChatResponse(BaseModel):
    """What the backend sends back."""

    message: str            # the AI's reply
    books: list[BookRead]   # the books the AI was given
    conversation_id: int | None = None   # the saved chat's id (None for guests)