from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.book import BookRead
from app.services import book as book_service

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[BookRead])
def read_books(course: str | None = None, db: Session = Depends(get_db)) -> Any:
    """List books. Add ?course=CC-COMPROG11 to filter by course."""
    return book_service.get_books(db, course)