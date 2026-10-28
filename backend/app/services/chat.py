from sqlalchemy.orm import Session

from app.repositories import book as book_repo
from app.schemas.chat import HistoryMessage
from app.services import llm
from app.services.book import book_to_text
from app.services.prompts import SYSTEM_PROMPT, build_user_prompt

TOP_K = 5
MAX_HISTORY = 6


def verify_command(db: Session, message: str, history: list[HistoryMessage]):
    """Deterministic database check that bypasses the LLM to verify if a book exists."""
    query = message.strip()[len("/verify"):].strip().strip('"').strip("'")

    # If the user just typed "/verify" with no title, check the AI's last message
    if not query:
        last_ai = next((m.content for m in reversed(history) if m.role == "assistant"), "")
        if not last_ai:
            return (
                "ℹ️ **Usage:** Type `/verify <book title>` (for example, `/verify Data Structures`) "
                "to check directly against the CCS Library database.",
                [],
            )
        all_books = book_repo.list_all(db)
        matched = [b for b in all_books if b.title.lower() in last_ai.lower()]
        if not matched:
            return (
                "⚠️ **Catalog Verification:** None of the exact book titles in the previous reply "
                "were found in the CCS Library database (possible AI hallucination). "
                "You can also check a specific keyword with `/verify <title>`.",
                [],
            )
        lines = "\n".join(f"{i}. **{b.title}**" for i, b in enumerate(matched[:5], start=1))
        return (
            f"✅ **Catalog Verification — {len(matched)} book(s) from the last reply exist in the CCS Library database:**\n\n{lines}",
            matched[:5],
        )

    # Search the PostgreSQL catalog directly by title
    matched = book_repo.search_by_title(db, query, limit=5)
    if not matched:
        return (
            f"❌ **Catalog Verification — Not Found:**\n\n"
            f"No book matching **\"{query}\"** exists in the CCS Library database. "
            f"If the AI recommended this title, it is a hallucination.",
            [],
        )

    lines = "\n".join(f"{i}. **{b.title}**" for i, b in enumerate(matched, start=1))
    return (
        f"✅ **Catalog Verification — Found {len(matched)} matching book(s) in the CCS Library database:**\n\n{lines}",
        matched,
    )


def answer(db: Session, message: str, history: list[HistoryMessage]):
    """RAG with memory: find matching books, then reply using the conversation so far."""
    if message.strip().lower().startswith("/verify"):
        return verify_command(db, message, history)

    recent = history[-MAX_HISTORY:]

    # 1. RETRIEVE
    
    # Search with the new message + the student's last question + the AI's last reply,
    # so follow-ups like "tell me more about it" find the book that was just discussed
    last_user = next((m.content for m in reversed(recent) if m.role == "user"), "")
    last_ai = next((m.content for m in reversed(recent) if m.role == "assistant"), "")
    search_text = f"{last_user} {last_ai[:300]} {message}".strip()
    query_vector = llm.embed([f"search_query: {search_text}"])[0]
    books = book_repo.search_similar(db, query_vector, limit=TOP_K)

    # 2. AUGMENT
    book_list = "\n\n---\n\n".join(book_to_text(b) for b in books)

    # 3. GENERATE
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in recent]
    messages.append({"role": "user", "content": build_user_prompt(book_list, message)})

    reply = llm.chat(messages)
    return reply, books
