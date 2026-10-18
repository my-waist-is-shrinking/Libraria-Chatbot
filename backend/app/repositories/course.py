from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course


def list_all(db: Session) -> list[Course]:
    """Get every course, sorted by code (CS101, CS102, ...)."""
    stmt = select(Course).order_by(Course.code)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, course_id: int) -> Course | None:
    """Find one course by id (None if not found)."""
    return db.get(Course, course_id)


def get_by_code(db: Session, code: str) -> Course | None:
    """Find one course by its code (used to stop duplicates like two "CS101")."""
    stmt = select(Course).where(Course.code == code)
    return db.scalars(stmt).first()


def get_many(db: Session, course_ids: list[int]) -> list[Course]:
    """Get several courses at once from a list of ids, e.g. [1, 3]."""
    if not course_ids:
        return []                                    # empty list = no courses, skip the database
    stmt = select(Course).where(Course.id.in_(course_ids))   # "in_" = id is one of these
    return list(db.scalars(stmt).all())


def create(db: Session, code: str, name: str) -> Course:
    """Add a new course to the database."""
    course = Course(code=code, name=name)
    db.add(course)
    db.flush()      # sends it to the database so course.id gets filled in
    return course


def delete(db: Session, course: Course) -> None:
    """Remove a course (books stay, they just lose this course tag)."""
    db.delete(course)