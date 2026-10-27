from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat as chat_service
from app.services import conversation as conversation_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),   # None = guest
) -> Any:
    """Ask Libraria a question. Answers only with books from the library. Logged-in users' chats are saved."""
    reply, books = chat_service.answer(db, request.message, request.history)

    conversation_id = None                             # guests: nothing is saved
    if user is not None:                               # logged in: save the question + reply
        conversation_id = conversation_service.save_exchange(
            db, user, request.conversation_id, request.message, reply
        )
    return {"message": reply, "books": books, "conversation_id": conversation_id}