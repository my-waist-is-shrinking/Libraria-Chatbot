from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# The connection to the database
engine = create_engine(settings.database_url)

# Makes a new "session" (a conversation with the database) per request
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Parent class for all tables."""


def get_db():
    """Give a route a database session, then close it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()