from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, ForeignKey, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

# Junction table: links books ↔ courses
book_courses = Table(
    "book_courses",
    Base.metadata,
    Column("book_id", ForeignKey("books.id"), primary_key=True),
    Column("course_id", ForeignKey("courses.id"), primary_key=True),
)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(150))


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(Text)          # "| None" = can be empty
    edition: Mapped[str | None] = mapped_column(String(50))
    publisher: Mapped[str | None] = mapped_column(String(255))
    call_number: Mapped[str | None] = mapped_column(String(50))
    format: Mapped[str] = mapped_column(String(10))
    description: Mapped[str | None] = mapped_column(Text)
    is_available: Mapped[bool]
    copies: Mapped[int] = mapped_column(default=1)             # how many copies the library owns
    embedding = mapped_column(Vector(768), nullable=True)      # AI numbers (filled in part 2)

    # All courses this book belongs to (uses the junction table)
    courses: Mapped[list[Course]] = relationship(secondary=book_courses)

    @property
    def is_indexed(self) -> bool:
        """True = the AI already knows this book. False = needs "Update AI index"."""
        return self.embedding is not None


class User(Base):
    """A logged-in account. Guests are NOT stored."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))     # bcrypt scramble, never the real password
    role: Mapped[str] = mapped_column(String(20), default="user") # user / librarian / admin
    is_active: Mapped[bool] = mapped_column(default=True)         # False = can't log in
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()        # database fills in the time
    )