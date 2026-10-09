from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat as chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def send_message(request: ChatRequest, db: Session = Depends(get_db)) -> Any:
    """Ask Libraria a question. Answers only with books from the library."""
    reply, books = chat_service.answer(db, request.message, request.history)
    return {"message": reply, "books": books}