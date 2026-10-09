"""Turn every book into an embedding and save it in the database.

Run from the backend folder:  python -m app.commands.embed_books
Run again whenever books are added or changed.
"""

from app.db.session import SessionLocal
from app.repositories import book as book_repo
from app.services import llm
from app.services.book import book_to_text

BATCH_SIZE = 16  # how many books to send to Ollama at once


def main():
    db = SessionLocal()
    try:
        books = book_repo.list_all(db)
        print(f"Embedding {len(books)} books...")

        for i in range(0, len(books), BATCH_SIZE):
            batch = books[i : i + BATCH_SIZE]

            # nomic-embed-text works best with this prefix for stored documents
            texts = [f"search_document: {book_to_text(b)}" for b in batch]
            vectors = llm.embed(texts)

            # Save each book's numbers
            for book, vector in zip(batch, vectors):
                book.embedding = vector
            db.commit()

            print(f"  {min(i + BATCH_SIZE, len(books))}/{len(books)} done")

        print("All books embedded!")
    finally:
        db.close()


if __name__ == "__main__":
    main()