from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, auth, books, chat, conversations, library
from app.core.config import settings

app = FastAPI(title="Libraria API")

# Allow the React app (port 5173) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(books.router)
app.include_router(chat.router)
app.include_router(conversations.router)   # saved chats (logged-in users)
app.include_router(library.router)   # librarian page: books, courses, AI index


@app.get("/api/health")
def health():
    """Quick check that the server is alive, and which AI models it is using."""
    return {
        "status": "ok",
        "chat_model": settings.chat_model,     # the model that writes replies
        "embed_model": settings.embed_model,   # the model that turns text into numbers
    }