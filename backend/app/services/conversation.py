from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Conversation, User
from app.repositories import conversation as conversation_repo

TITLE_LENGTH = 60   # how much of the first message becomes the sidebar title


def list_conversations(db: Session, user: User) -> list[Conversation]:
    """The logged-in user's saved chats."""
    return conversation_repo.list_for_user(db, user.id)


def get_conversation(db: Session, user: User, conversation_id: int) -> Conversation:
    """One of the user's chats. 404 if it doesn't exist OR belongs to someone else."""
    conversation = conversation_repo.get_for_user(db, conversation_id, user.id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return conversation


def delete_conversation(db: Session, user: User, conversation_id: int) -> None:
    """Delete one of the user's chats."""
    conversation = get_conversation(db, user, conversation_id)   # also checks the owner
    conversation_repo.delete(db, conversation)


def save_exchange(db: Session, user: User, conversation_id: int | None, question: str, reply: str) -> int:
    """Save the student's question + the AI's reply. Starts a new chat if there's no id yet. Returns the chat id."""
    if conversation_id is None:                                   # first message: make a new chat
        conversation = conversation_repo.create(db, user.id, question[:TITLE_LENGTH])
    else:
        conversation = get_conversation(db, user, conversation_id)  # existing chat (owner checked)
    conversation_repo.add_message(db, conversation.id, "user", question)
    conversation_repo.add_message(db, conversation.id, "assistant", reply)
    return conversation.id