"""Seed the Supabase / PostgreSQL database from database/BSCS_Holdings_Cleaned.csv.

Usage:
    python -m app.commands.seed_books
"""

import csv
import re
from pathlib import Path

from sqlalchemy import select, text
from app.db.session import SessionLocal
from app.db.models import Book, Course, book_courses


def clean_title_key(title: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "", title or "").lower()


def seed_database():
    csv_path = Path(__file__).resolve().parents[3] / "database" / "BSCS_Holdings_Cleaned.csv"
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return

    print(f"Reading {csv_path}...")
    db = SessionLocal()
    try:
        # Ensure schema has needs_reindex column if not present
        db.execute(text("ALTER TABLE books ADD COLUMN IF NOT EXISTS needs_reindex BOOLEAN NOT NULL DEFAULT FALSE;"))
        db.commit()

        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Loaded {len(rows)} raw rows from CSV.")

        # Cache existing courses to avoid duplicates
        existing_courses = {c.code.strip(): c for c in db.scalars(select(Course)).all()}
        
        # 1. Collect and insert distinct courses
        courses_to_create = {}
        exploded = []
        for r in rows:
            subject = (r.get("PROFESSIONAL SUBJECTS") or r.get("subject") or "").strip()
            title = (r.get("TITLE") or r.get("title") or "").strip()
            if not title:
                continue

            sub_courses = [s.strip() for s in subject.split(" / ") if s.strip()]
            for s in sub_courses:
                parts = s.split(" - ", 1)
                course_code = parts[0].replace(" ", "").strip()
                course_name = parts[1].strip() if len(parts) > 1 else course_code
                if course_name == course_name.upper():
                    course_name = course_name.title()

                if course_code and course_code not in existing_courses and course_code not in courses_to_create:
                    courses_to_create[course_code] = Course(code=course_code, name=course_name)

                exploded.append({
                    "title": title,
                    "author": (r.get("AUTHOR") or r.get("author") or "").strip() or None,
                    "edition": (r.get("EDITION") or r.get("edition") or "").strip() or None,
                    "publisher": (r.get("PUBLISHER") or r.get("publisher") or "").strip() or None,
                    "call_number": (r.get("CALL NUMBER") or r.get("call_number") or "").strip() or None,
                    "course_code": course_code,
                    "title_key": clean_title_key(title),
                })

        if courses_to_create:
            db.add_all(list(courses_to_create.values()))
            db.flush()
            print(f"Added {len(courses_to_create)} new courses.")

        # Refresh all courses map
        all_courses = {c.code.strip(): c for c in db.scalars(select(Course)).all()}

        # 2. Insert distinct books (deduplicated by title_key + edition)
        existing_books = db.scalars(select(Book)).all()
        book_key_map = {}
        for b in existing_books:
            k = (clean_title_key(b.title), (b.edition or "").strip())
            book_key_map[k] = b

        books_to_insert = {}
        book_course_pairs = []

        for item in exploded:
            t_key = item["title_key"]
            ed_key = (item["edition"] or "").strip()
            k = (t_key, ed_key)

            if k not in book_key_map and k not in books_to_insert:
                raw_call = item["call_number"] or ""
                is_ebook = raw_call.lower().startswith("e-book")
                call_no = None if is_ebook else re.sub(r"\s+", " ", raw_call).strip() or None
                fmt = "E-Book" if is_ebook else "Print"

                book_obj = Book(
                    title=item["title"],
                    author=item["author"],
                    edition=item["edition"],
                    publisher=item["publisher"],
                    call_number=call_no,
                    format=fmt,
                    is_available=True,
                    copies=1,
                    needs_reindex=True,
                )
                books_to_insert[k] = book_obj

            book_course_pairs.append((k, item["course_code"]))

        if books_to_insert:
            db.add_all(list(books_to_insert.values()))
            db.flush()
            print(f"Added {len(books_to_insert)} new books.")

        # Refresh book map
        for k, b in books_to_insert.items():
            book_key_map[k] = b

        # 3. Link books to courses
        existing_links = set(db.execute(text("SELECT book_id, course_id FROM book_courses")).all())
        new_links = set()

        for k, c_code in book_course_pairs:
            book = book_key_map.get(k)
            course = all_courses.get(c_code)
            if book and course and (book.id, course.id) not in existing_links and (book.id, course.id) not in new_links:
                new_links.add((book.id, course.id))

        if new_links:
            db.execute(
                book_courses.insert(),
                [{"book_id": b_id, "course_id": c_id} for b_id, c_id in new_links]
            )
            db.commit()
            print(f"Linked {len(new_links)} book-course relations.")
        else:
            db.commit()

        total_courses = db.scalar(text("SELECT COUNT(*) FROM courses"))
        total_books = db.scalar(text("SELECT COUNT(*) FROM books"))
        total_links = db.scalar(text("SELECT COUNT(*) FROM book_courses"))

        print("\n Seeding completed successfully!")
        print(f"Total courses:      {total_courses}")
        print(f"Total books:        {total_books}")
        print(f"Total book-courses: {total_links}")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
