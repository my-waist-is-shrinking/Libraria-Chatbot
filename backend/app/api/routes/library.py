import shutil
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.models import User
from app.db.session import get_db
from app.schemas.book import (
    BookCreate,
    BookImport,
    BookRead,
    BookUpdate,
    CourseCreate,
    CourseRead,
    CourseUpdate,
    ImportResult,
)
from app.services import library as library_service

# Every door here is for librarians (admin is always allowed too, see require_roles)
router = APIRouter(prefix="/api/library", tags=["library"])
staff_only = require_roles("librarian")


def handle_errors(action):
    """Run a library action and turn its errors into messages the app can show."""
    try:
        return action()
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))     # book/course doesn't exist
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))   # bad input / duplicate


# ---------- Books ----------

@router.get("/books", response_model=list[BookRead])
def read_books(db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """List every book (with description and AI badge info)."""
    return library_service.list_books(db)


@router.post("/books", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(data: BookCreate, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Add a new book."""
    return handle_errors(lambda: library_service.add_book(db, data))


@router.post("/books/import", response_model=ImportResult)
def import_books(data: BookImport, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Add many books at once from a CSV file (sent as text)."""
    return handle_errors(lambda: library_service.import_csv(db, data.csv_text))


@router.patch("/books/{book_id}", response_model=BookRead)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Edit a book (only the fields sent are changed)."""
    return handle_errors(lambda: library_service.edit_book(db, book_id, data))


@router.delete("/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Remove a book for good."""
    handle_errors(lambda: library_service.delete_book(db, book_id))
    return {"message": "Book deleted."}   # a small reply so the app's response.json() still works


# ---------- Courses ----------

@router.get("/courses", response_model=list[CourseRead])
def read_courses(db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """List every course."""
    return library_service.list_courses(db)


@router.post("/courses", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(data: CourseCreate, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Add a new course."""
    return handle_errors(lambda: library_service.add_course(db, data))


@router.patch("/courses/{course_id}", response_model=CourseRead)
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Rename a course."""
    return handle_errors(lambda: library_service.edit_course(db, course_id, data))


@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """Remove a course (its books stay)."""
    handle_errors(lambda: library_service.delete_course(db, course_id))
    return {"message": "Course deleted."}


# ---------- Cover Upload ----------

@router.post("/upload-cover")
def upload_cover(
    file: UploadFile = File(...),
    staff: User = Depends(staff_only),
) -> Any:
    """Save an uploaded book cover image to uploads/covers and return its URL."""
    # Validate extension
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format. Please use {', '.join(allowed)}.",
        )

    # Save to disk with unique name
    unique_name = f"{uuid4().hex}{ext}"
    dest = Path("uploads/covers") / unique_name
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"http://localhost:8000/uploads/covers/{unique_name}"}


# ---------- AI index ----------

@router.post("/ai-index")
def update_ai_index(db: Session = Depends(get_db), staff: User = Depends(staff_only)) -> Any:
    """The "Update AI index" button: embed every book that has the badge."""
    try:
        count = library_service.update_ai_index(db)
    except Exception:
        # usually means the Ollama app isn't open
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Couldn't reach the AI. Make sure Ollama is running, then try again.",
        )
    return {"updated": count, "message": f"AI index updated: {count} book(s)."}
