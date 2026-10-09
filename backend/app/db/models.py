from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, String, Table, Text
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
    embedding = mapped_column(Vector(768), nullable=True)      # AI numbers (filled in part 2)

    # All courses this book belongs to (uses the junction table)
    courses: Mapped[list[Course]] = relationship(secondary=book_courses)