from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Book, Course


def list_books(db: Session, course_code: str | None = None, limit: int = 50) -> list[Book]:
    """Get books, optionally only for one course."""
    stmt = (
        select(Book)
        .options(selectinload(Book.courses))  # also load each book's courses
        .order_by(Book.title)
        .limit(limit)
    )
    if course_code:
        stmt = stmt.join(Book.courses).where(Course.code == course_code)
    return list(db.scalars(stmt).all())


def list_all(db: Session) -> list[Book]:
    """Get every book (used by the embedding script)."""
    stmt = select(Book).options(selectinload(Book.courses)).order_by(Book.id)
    return list(db.scalars(stmt).all())


def search_similar(db: Session, query_embedding: list[float], limit: int = 5) -> list[Book]:
    """Find the books whose meaning is closest to the question (pgvector)."""
    stmt = (
        select(Book)
        .options(selectinload(Book.courses))
        .where(Book.embedding.is_not(None))                          # skip books without embeddings
        .order_by(Book.embedding.cosine_distance(query_embedding))   # smallest distance = most similar
        .limit(limit)
    )
    return list(db.scalars(stmt).all())