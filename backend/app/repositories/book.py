from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Book, Course


def list_books(db: Session, course_code: str | None = None, limit: int = 500) -> list[Book]:
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

def search_by_title(db: Session, title: str, limit: int = 30) -> list[Book]:
    """Find the books in the library collection whose title matches the keyword typed (capital letters ignored)."""    
    pattern = f"%{title}%"                     # % = anything before/after, so part of a title still works
    stmt = (
        select(Book)                           # get books
        .options(selectinload(Book.courses))   # also load each book's courses
        .where(Book.title.ilike(pattern))      # ilike = ignore capital letters; ONLY the title is checked
        .order_by(Book.title)                  # sort A to Z
        .limit(limit)                          # at most 30 results
    )
    return list(db.scalars(stmt).all())        # run it and return the books as a list

def list_all(db: Session) -> list[Book]:
    """Get every book (used by the embedding script and the librarian page)."""
    stmt = select(Book).options(selectinload(Book.courses)).order_by(Book.id)
    return list(db.scalars(stmt).all())


def list_not_indexed(db: Session) -> list[Book]:
    """Get books the AI doesn't know yet or that have pending updates."""
    stmt = (
        select(Book)
        .options(selectinload(Book.courses))
        .where(or_(Book.embedding.is_(None), Book.needs_reindex.is_(True)))
        .order_by(Book.id)
    )
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, book_id: int) -> Book | None:
    """Find one book by id (None if not found)."""
    return db.get(Book, book_id)


def create(db: Session, book: Book) -> Book:
    """Add a new book to the database."""
    db.add(book)
    db.flush()      # sends it to the database so book.id gets filled in
    return book


def delete(db: Session, book: Book) -> None:
    """Remove a book (its course links are removed too)."""
    db.delete(book)


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