"""The librarian's rules: add/edit/delete books and courses, CSV import, and update the AI index."""

import csv
import io
import re

from sqlalchemy.orm import Session

from app.db.models import Book, Course
from app.repositories import book as book_repo
from app.repositories import course as course_repo
from app.schemas.book import BookCreate, BookUpdate, CourseCreate, CourseUpdate
from app.services import llm
from app.services.book import book_to_text

BATCH_SIZE = 16  # how many books to send to Ollama at once (same as embed_books)

# Fields that appear in book_to_text. If one of these changes, the AI's copy is outdated.
AI_TEXT_FIELDS = {"title", "author", "publisher", "edition", "call_number", "format"}


# ---------- Books ----------

def list_books(db: Session) -> list[Book]:
    """Every book for the librarian's table (the page does search/filter itself)."""
    return book_repo.list_all(db)


def get_book_or_error(db: Session, book_id: int) -> Book:
    """Find a book by id, or stop with an error if it doesn't exist."""
    book = book_repo.get_by_id(db, book_id)
    if book is None:
        raise LookupError("Book not found.")
    return book


def courses_from_ids(db: Session, course_ids: list[int]) -> list[Course]:
    """Turn [1, 3] into real courses, or stop if one of the ids doesn't exist."""
    courses = course_repo.get_many(db, course_ids)
    if len(courses) != len(set(course_ids)):          # set() ignores repeated ids
        raise ValueError("One of the selected courses doesn't exist.")
    return courses


def add_book(db: Session, data: BookCreate) -> Book:
    """Add a new book. It starts with no embedding, so it shows "Needs AI update"."""
    fields = data.model_dump(exclude={"course_ids"})  # everything except course_ids
    book = Book(**fields)                             # ** = fill in title=..., author=..., etc.
    book.courses = courses_from_ids(db, data.course_ids)
    return book_repo.create(db, book)


def edit_book(db: Session, book_id: int, data: BookUpdate) -> Book:
    """Change only the fields the librarian sent."""
    book = get_book_or_error(db, book_id)
    changes = data.model_dump(exclude_unset=True)     # only what was actually sent
    course_ids = changes.pop("course_ids", None)      # handle courses separately

    if "title" in changes and changes["title"] is None:
        raise ValueError("Title can't be empty.")
    if "format" in changes and changes["format"] is None:
        raise ValueError("Format must be Print or E-Book.")
    if "is_available" in changes and changes["is_available"] is None:
        raise ValueError("Availability must be true or false.")
    if "copies" in changes and changes["copies"] is None:
        raise ValueError("Copies must be a number (0 or more).")

    needs_ai_update = False
    for field, value in changes.items():
        if field in AI_TEXT_FIELDS and getattr(book, field) != value:
            needs_ai_update = True                    # the AI's text for this book changed
        setattr(book, field, value)                   # same as book.title = value, etc.

    if course_ids is not None:
        book.courses = courses_from_ids(db, course_ids)
        needs_ai_update = True                        # courses are part of the AI text too

    if needs_ai_update:
        book.embedding = None                         # empty = "Needs AI update" badge
    return book


def delete_book(db: Session, book_id: int) -> None:
    """Remove a book for good."""
    book = get_book_or_error(db, book_id)
    book_repo.delete(db, book)


# ---------- Courses ----------

def list_courses(db: Session) -> list[Course]:
    """Every course, sorted by code."""
    return course_repo.list_all(db)


def get_course_or_error(db: Session, course_id: int) -> Course:
    """Find a course by id, or stop with an error if it doesn't exist."""
    course = course_repo.get_by_id(db, course_id)
    if course is None:
        raise LookupError("Course not found.")
    return course


def books_with_course(db: Session, course: Course) -> list[Book]:
    """All books tagged with this course."""
    return [b for b in book_repo.list_all(db) if course in b.courses]


def add_course(db: Session, data: CourseCreate) -> Course:
    """Add a new course, e.g. CS101."""
    code = data.code.strip().upper()                  # " cs101 " -> "CS101"
    if course_repo.get_by_code(db, code):
        raise ValueError(f"Course {code} already exists.")
    return course_repo.create(db, code=code, name=data.name.strip())


def edit_course(db: Session, course_id: int, data: CourseUpdate) -> Course:
    """Rename a course's code or name."""
    course = get_course_or_error(db, course_id)
    if data.code is not None:
        code = data.code.strip().upper()
        other = course_repo.get_by_code(db, code)
        if other and other.id != course.id:           # another course already uses this code
            raise ValueError(f"Course {code} already exists.")
        course.code = code
    if data.name is not None:
        course.name = data.name.strip()

    # course names are in the AI text, so its books need an AI update
    for book in books_with_course(db, course):
        book.embedding = None
    return course


def delete_course(db: Session, course_id: int) -> None:
    """Remove a course. Its books stay, they just lose this course tag."""
    course = get_course_or_error(db, course_id)
    for book in books_with_course(db, course):
        book.courses.remove(course)                   # untag the book first
        book.embedding = None                         # its AI text changed
    course_repo.delete(db, course)


# ---------- CSV import ----------

MAX_IMPORT_ROWS = 2000  # stops someone from uploading a giant file by mistake


def title_key(title: str) -> str:
    """"Clean Code: A Handbook" -> "cleancodeahandbook" (to spot the same book twice)."""
    return re.sub(r"[^a-z0-9]", "", title.lower())


def empty_to_none(value: str | None) -> str | None:
    """Trim spaces; an empty cell becomes None (= no value)."""
    value = (value or "").strip()
    return value or None


def import_csv(db: Session, csv_text: str) -> dict:
    """Add many books at once from a CSV (same columns as BSCS_Holdings_Cleaned.csv).

    Columns: TITLE (required), AUTHOR, EDITION, PUBLISHER, CALL NUMBER,
    PROFESSIONAL SUBJECTS, and optional DESCRIPTION and COPIES.
    All or nothing: if one row has a problem, nothing is saved.
    """
    reader = csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))  # \ufeff = invisible Excel mark at the start
    if not reader.fieldnames:
        raise ValueError("The file is empty.")

    # Make column names easy to match: " Title " -> "TITLE"
    reader.fieldnames = [name.strip().upper() for name in reader.fieldnames]
    if "TITLE" not in reader.fieldnames:
        raise ValueError("The file needs a TITLE column.")

    # Books that already exist (same title + edition) get skipped, not added twice
    existing = {(title_key(b.title), (b.edition or "").lower()) for b in book_repo.list_all(db)}

    added, skipped, new_courses, errors = 0, 0, [], []

    for row_number, row in enumerate(reader, start=2):   # start=2 because row 1 is the header
        if row_number - 1 > MAX_IMPORT_ROWS:
            raise ValueError(f"Too many rows. The limit is {MAX_IMPORT_ROWS} books per file.")

        title = empty_to_none(row.get("TITLE"))
        if title is None:
            continue                                     # blank line: just ignore it

        edition = empty_to_none(row.get("EDITION"))
        key = (title_key(title), (edition or "").lower())
        if key in existing:
            skipped += 1                                 # already in the library
            continue

        # "E-Book" in CALL NUMBER means it's online (no shelf)
        call_number = empty_to_none(row.get("CALL NUMBER"))
        is_ebook = call_number is not None and call_number.lower().startswith("e-book")
        if is_ebook:
            call_number = None
        elif call_number:
            call_number = re.sub(r"\s+", " ", call_number)   # "Ref.  005" -> "Ref. 005"

        # COPIES column is optional (empty = 1)
        copies_text = empty_to_none(row.get("COPIES"))
        try:
            copies = int(copies_text) if copies_text else 1
            if copies < 0:
                raise ValueError
        except ValueError:
            errors.append(f"Row {row_number}: COPIES must be a number (0 or more).")
            continue

        # Check sizes before saving (same limits as the database)
        author = empty_to_none(row.get("AUTHOR"))
        publisher = empty_to_none(row.get("PUBLISHER"))
        if edition and len(edition) > 50:
            errors.append(f"Row {row_number}: EDITION is longer than 50 letters.")
            continue
        if publisher and len(publisher) > 255:
            errors.append(f"Row {row_number}: PUBLISHER is longer than 255 letters.")
            continue
        if call_number and len(call_number) > 50:
            errors.append(f"Row {row_number}: CALL NUMBER is longer than 50 letters.")
            continue

        # Courses: "CC-COMPROG11 - Computer Programming 1 / CC-DATASTRUC21 - Data Structures"
        courses = []
        for part in (row.get("PROFESSIONAL SUBJECTS") or "").split(" / "):
            if not part.strip():
                continue
            code, _, name = part.partition(" - ")       # split "CODE - Name" into 2 parts
            code = code.replace(" ", "").upper()       # "CC-COMPROG 11" -> "CC-COMPROG11"
            name = name.strip() or code
            if len(code) > 20 or len(name) > 150:
                errors.append(f"Row {row_number}: course \"{part.strip()}\" is too long.")
                break
            course = course_repo.get_by_code(db, code)
            if course is None:
                course = course_repo.create(db, code=code, name=name)  # new course: create it
                new_courses.append(code)
            if course not in courses:
                courses.append(course)
        else:
            # (this "else" runs only if the loop above did NOT stop with "break")
            book = Book(
                title=title,
                author=author,
                edition=edition,
                publisher=publisher,
                call_number=call_number,
                format="E-Book" if is_ebook else "Print",
                description=empty_to_none(row.get("DESCRIPTION")),
                is_available=True,
                copies=copies,
            )
            book.courses = courses
            book_repo.create(db, book)                   # no embedding yet = "Needs AI update"
            existing.add(key)                            # so the same book twice in the file is skipped
            added += 1

    if errors:
        # ValueError makes get_db undo everything, so nothing from this file is saved
        shown = "; ".join(errors[:5])
        more = f" (and {len(errors) - 5} more)" if len(errors) > 5 else ""
        raise ValueError(f"Nothing was imported. Fix these rows and try again: {shown}{more}")

    return {"added": added, "skipped": skipped, "new_courses": new_courses}


# ---------- AI index ----------

def update_ai_index(db: Session) -> int:
    """Embed only the books the AI doesn't know yet. Returns how many were done."""
    books = book_repo.list_not_indexed(db)

    for i in range(0, len(books), BATCH_SIZE):
        batch = books[i : i + BATCH_SIZE]

        # nomic-embed-text works best with this prefix for stored documents
        texts = [f"search_document: {book_to_text(b)}" for b in batch]
        vectors = llm.embed(texts)

        # Save each book's numbers
        for book, vector in zip(batch, vectors):
            book.embedding = vector
        db.flush()                                    # get_db saves everything at the end

    return len(books)
