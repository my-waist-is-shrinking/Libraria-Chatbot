from sqlalchemy.orm import Session

from app.repositories import book as book_repo
from app.schemas.chat import HistoryMessage
from app.services import llm
from app.services.book import book_to_text
from app.services.prompts import SYSTEM_PROMPT, build_user_prompt

TOP_K = 5          # how many books to give the AI
MAX_HISTORY = 6    # how many earlier messages the AI remembers (3 back-and-forths)


def answer(db: Session, message: str, history: list[HistoryMessage]):
    """RAG with memory: find matching books, then reply using the conversation so far."""
    recent = history[-MAX_HISTORY:]

    # 1. RETRIEVE: search using the new message + the student's previous message,
    #    so follow-ups like "any for beginners?" still find the right topic
    last_user = next((m.content for m in reversed(recent) if m.role == "user"), "")
    search_text = f"{last_user} {message}".strip()
    query_vector = llm.embed([f"search_query: {search_text}"])[0]
    books = book_repo.search_similar(db, query_vector, limit=TOP_K)

    # 2. AUGMENT: numbered book list
    book_list = "\n\n".join(f"[{i}]\n{book_to_text(b)}" for i, b in enumerate(books, start=1))

    # 3. GENERATE: rules → earlier messages → new message with books
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in recent]
    messages.append({"role": "user", "content": build_user_prompt(book_list, message)})

    reply = llm.chat(messages)
    return reply, books