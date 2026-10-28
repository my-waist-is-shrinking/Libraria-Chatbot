from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# a book can only be one of these two (same rule as the database CHECK)
BookFormat = Literal["Print", "E-Book"]


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # can read from database objects

    id: int
    code: str
    name: str


class CourseCreate(BaseModel):
    # what the librarian types when adding a course
    code: str = Field(min_length=1, max_length=20)   # e.g. "CS101" (database allows 20 letters)
    name: str = Field(min_length=1, max_length=150)  # e.g. "Intro to Programming"


class CourseUpdate(BaseModel):
    # renaming a course: only send what changes
    code: str | None = Field(default=None, min_length=1, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=150)


class BookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str | None
    edition: str | None
    publisher: str | None
    call_number: str | None
    format: str
    description: str | None   # the librarian page shows and edits this
    cover_image: str | None
    is_available: bool
    
    copies: int               # how many copies the library owns
    is_indexed: bool          # False = shows the "Needs AI update" badge
    courses: list[CourseRead]
    # embedding is NOT included: students don't need to see 768 numbers


class BookCreate(BaseModel):
    # what the librarian fills in when adding a new book
    title: str = Field(min_length=1)                       # the only required field
    author: str | None = None
    edition: str | None = Field(default=None, max_length=50)
    publisher: str | None = Field(default=None, max_length=255)
    call_number: str | None = Field(default=None, max_length=50)
    format: BookFormat = "Print"                           # "Print" if not given
    description: str | None = None
    cover_image: str | None
    is_available: bool = True                              # new books start available
    copies: int = Field(default=1, ge=0)                   # ge=0 = 0 or more (no negative copies)
    course_ids: list[int] = []                             # which courses this book belongs to, e.g. [1, 3]


class BookUpdate(BaseModel):
    # editing a book: every field is optional, only the ones sent get changed
    title: str | None = Field(default=None, min_length=1)
    author: str | None = None
    edition: str | None = Field(default=None, max_length=50)
    publisher: str | None = Field(default=None, max_length=255)
    call_number: str | None = Field(default=None, max_length=50)
    format: BookFormat | None = None
    description: str | None = None
    cover_image: str | None = None
    is_available: bool | None = None
    copies: int | None = Field(default=None, ge=0)         # None = keep the same number
    course_ids: list[int] | None = None                    # None = keep the courses as they are


class BookImport(BaseModel):
    # the "Import CSV" button sends the whole file as text
    csv_text: str = Field(min_length=1)


class ImportResult(BaseModel):
    # what the page shows after an import
    added: int                 # new books saved
    skipped: int               # rows skipped because the book already exists
    new_courses: list[str]     # course codes that didn't exist yet and were created
