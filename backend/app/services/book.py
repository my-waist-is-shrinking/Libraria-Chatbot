from sqlalchemy.orm import Session

from app.db.models import Book
from app.repositories import book as book_repo


def get_books(db: Session, course_code: str | None = None):
    """Business logic for listing books."""
    return book_repo.list_books(db, course_code)


def book_to_text(book: Book) -> str:
    """Describe one book in plain text (used for embeddings AND for the AI's context)."""
    # All courses this book is used in, e.g. "CC-COMPROG11 Computer Programming 1"
    courses = ", ".join(f"{c.code} {c.name}" for c in book.courses)

    # Where to find it: e-books are online, print books use the call number
    location = "E-Book (online)" if book.format == "E-Book" else (book.call_number or "Ask the librarian")

    # Build the text line by line, skipping anything the CSV left empty
    lines = [f"Title: {book.title}"]
    if book.author:                      # only include the author if we have one
        lines.append(f"Author: {book.author}")
    if book.publisher:                   # some books have no publisher
        lines.append(f"Publisher: {book.publisher}")
    if book.edition:                     # many books have no edition
        lines.append(f"Edition: {book.edition}")
    lines.append(f"Courses: {courses}")
    lines.append(f"Location: {location}")

    # Join into one block of text, one detail per line
    return "\n".join(lines)