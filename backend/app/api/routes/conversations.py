from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.conversation import ConversationRead, MessageRead
from app.services import conversation as conversation_service

# Every route here needs a logged-in user (guests have no saved chats)
router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationRead])
def read_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Any:
    """My saved chats, newest first (for the sidebar)."""
    return conversation_service.list_conversations(db, user)


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
def read_messages(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Any:
    """All messages of one of my chats, oldest first."""
    return conversation_service.get_conversation(db, user, conversation_id).messages


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    """Delete one of my chats."""
    conversation_service.delete_conversation(db, user, conversation_id)