from pydantic import BaseModel, ConfigDict


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # can read from database objects

    id: int
    code: str
    name: str


class BookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str | None
    edition: str | None
    publisher: str | None
    call_number: str | None
    format: str
    is_available: bool
    courses: list[CourseRead]
    # embedding is NOT included: students don't need to see 768 numbers