from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Conversation, Message


def list_for_user(db: Session, user_id: int) -> list[Conversation]:
    """Get one user's saved chats, newest first (for the sidebar)."""
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)        # only THIS user's chats
        .order_by(Conversation.created_at.desc(), Conversation.id.desc())  # newest on top
    )
    return list(db.scalars(stmt).all())


def get_for_user(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
    """Find one chat, but only if it belongs to this user (None otherwise)."""
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,               # stops users from opening someone else's chat
    )
    return db.scalars(stmt).first()


def create(db: Session, user_id: int, title: str) -> Conversation:
    """Start a new saved chat."""
    conversation = Conversation(user_id=user_id, title=title)
    db.add(conversation)
    db.flush()      # sends it to the database so conversation.id gets filled in
    return conversation


def add_message(db: Session, conversation_id: int, role: str, content: str) -> Message:
    """Save one message into a chat."""
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    db.flush()
    return message


def delete(db: Session, conversation: Conversation) -> None:
    """Remove a chat (its messages are removed too)."""
    db.delete(conversation)