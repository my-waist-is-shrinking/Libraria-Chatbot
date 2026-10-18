# Libraria Handoff Summary

_As of 2026-10-18 · gio_

## Overview

Libraria is a RAG (retrieval-augmented generation) web chatbot that recommends CCS library books. It finds the closest books to a student's question with pgvector, then a local Ollama model writes the answer using only those books. It runs fully on one laptop, with no paid APIs.

| Part | Technology |
| --- | --- |
| Frontend | Vite + React, Tailwind CSS, react-router-dom v7, Headless UI, Heroicons |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic, bcrypt (passwords), PyJWT (login tokens) |
| Database | PostgreSQL 17 + pgvector, in Docker (container `libraria-db`) |
| AI | Ollama: `nomic-embed-text` (embeddings, 768 numbers), `llama3.2:3b` or `qwen2.5:7b` (chat) |

The backend uses four layers, and each request goes down them in order: **routes** (the URLs) → **services** (the rules) → **repositories** (database queries) → **db** (tables). Routes never touch the database directly. `get_db` saves (commits) at the end of a request, and undoes everything (rollback) if an error happens.

The book data came from `database/BSCS_Holdings_Cleaned.csv`, loaded by `database/import_books.sql`: 178 books in 30 courses after duplicates were merged.

## What's done

All four roles work end to end: guest, student, librarian and admin. Admin can do everything a librarian can.

| Role | What they can do | Where |
| --- | --- | --- |
| Guest | Chat with the book assistant without an account | Login page → "Continue as guest" |
| Student (`user`) | Sign up, log in, chat, edit their name (Profile), change their password (Settings) | `/signup`, `/login`, `/chat`, menu on their name |
| Librarian | Everything a student can, plus the Library page: add, edit and delete books; toggle availability; set copies; manage courses; search and filter; stats cards; import a CSV; "Update AI index" | Menu → Manage books → `/library` |
| Admin | Everything a librarian can, plus Manage users: list accounts, create librarian or admin accounts, change roles, activate or deactivate, reset passwords | Menu → Manage users → `/admin` |

**Backend API** (all under `http://localhost:8000`, try them at `/docs`):

| Prefix | Routes | Who |
| --- | --- | --- |
| `/api/auth` | `POST /login`, `POST /register`, `GET /me`, `PATCH /me`, `POST /change-password` | Anyone / logged in |
| `/api/books` | `GET /api/books?course=` | Public |
| `/api/chat` | `POST /api/chat` (the RAG chat) | Public |
| `/api/admin` | `GET` and `POST /users`, `PATCH /users/{id}/role`, `PATCH /users/{id}/status`, `POST /users/{id}/reset-password` | Admin |
| `/api/library` | Books: `GET`, `POST`, `PATCH`, `DELETE` and `POST /books/import` (CSV). Courses: `GET`, `POST`, `PATCH`, `DELETE`. `POST /ai-index` | Librarian, admin |

**How the important parts work:**

- **Passwords** are stored only as bcrypt hashes. Nobody can see a real password, so admins reset forgotten ones instead.
- **Login tokens** are JWTs that last 24 hours. A 401 error logs the user out, and a 403 means the wrong role.
- **The "Needs AI update" badge** shows on new books, and on books whose AI-relevant fields changed (title, author, publisher, edition, call number, format, courses). Availability, copies and description don't trigger it. "Update AI index" embeds only the books with the badge.
- **CSV import** uses the same columns as the holdings CSV, plus optional DESCRIPTION and COPIES. It skips books that already exist (same title and edition), creates new courses, and is all or nothing: one bad row means nothing is saved.
- **Retrieval evaluation:** P@5 0.70 and R@5 0.82 on a 25-query golden set (`backend/evaluation/`).

## Project structure

The backend is grouped by layer; the frontend is grouped by role (reorganized on Oct 18).

```
Libraria/
├─ docker-compose.yml            PostgreSQL + pgvector
├─ database/
│  ├─ schema.sql                 all tables (users, courses, books + copies, book_courses, conversations, messages)
│  ├─ import_books.sql           loads + cleans the holdings CSV
│  └─ BSCS_Holdings_Cleaned.csv
├─ backend/app/
│  ├─ main.py                    starts the API, registers the routers
│  ├─ core/config.py             reads .env (DATABASE_URL, SECRET_KEY, Ollama)
│  ├─ db/                        session.py (get_db), models.py (User, Book, Course)
│  ├─ schemas/                   user.py, book.py, chat.py
│  ├─ repositories/              user.py, book.py, course.py
│  ├─ services/                  auth, admin, library, book, chat, llm, prompts
│  ├─ api/                       deps.py (get_current_user, require_roles), routes/
│  └─ commands/                  create_admin, embed_books, evaluate_retrieval
└─ frontend/libraria-app/src/
   ├─ App.jsx                    routes + role checks
   ├─ context/AuthContext.jsx    login state, authFetch, profile + password
   ├─ pages/auth/                LoginPage, SignUpPage
   ├─ pages/admin/               AdminUsersPage
   ├─ pages/librarian/           LibraryPage
   ├─ components/chat/           Chat, ChatMessage
   ├─ components/account/        AccountModal (Profile + Settings), LoginModal
   └─ components/librarian/      BookForm, CoursesPanel
```

## What's lacking and what to improve

The biggest gap is saved chats: the `conversations` and `messages` tables exist but nothing uses them yet, so chats disappear on refresh or logout. Tick these off as you go.

**High priority (features the handoff plan still needs)**

- [ ] **Saved chats:** save each logged-in user's conversations and messages, and load them in the sidebar. Guests stay unsaved.
- [ ] **"What students are asking" for librarians:** popular questions, and questions where no good book was found. Needs saved chats first.
- [ ] **Send staff to their page after login:** librarians to `/library`, admins to `/admin`. Today everyone lands on `/chat`.
- [ ] **Evaluation layers 2–4:** only layer 1 (retrieval: P@5 0.70, R@5 0.82) is done, and the 25-query golden set still needs a group review.

**Medium priority (AI quality)**

- [ ] **Descriptions aren't used by the AI:** `book_to_text` (in `services/book.py`) leaves out `description`, so filling in descriptions doesn't improve search yet. Adding it means re-embedding all books and re-running the evaluation.
- [ ] **Availability isn't in the AI text** either, so the chatbot may recommend a book marked "Not available" (inferred from `book_to_text`; not tested in chat).
- [ ] **"Update AI index" runs inside one request:** with many books it can take a while, with no progress bar.

**Medium priority (code health)**

- [ ] **No automated tests in the repo:** the features were tested by hand and in throwaway scripts, so add `pytest` tests for auth, admin and library.
- [ ] **`updated_at` on books is never updated** by the app (the model has no `onupdate`).
- [ ] **Course codes:** the database allows the same code with two different names (`UNIQUE (code, name)`), but the app treats the code as unique.
- [ ] **CSV import:** if the same book appears twice in one file with different courses, only the first row's courses are kept. Excel files must be saved as **CSV UTF-8**, or letters like ñ get garbled.
- [ ] **Error messages:** FastAPI validation errors (422) show as "Something went wrong" because `authFetch` only shows text details.
- [ ] **Leftover starter files:** `App.css`, `assets/react.svg` and `assets/vite.svg` are unused.

**Before deploying anywhere other than a laptop (security)**

- [ ] The login token is kept in `localStorage`, which a cross-site scripting bug could read. It lasts 24 hours, with no refresh.
- [ ] There's no limit on login attempts, and no "forgot password" email (an admin resets it instead).
- [ ] CORS only allows `http://localhost:5173`, and `API_URL` is hard-coded in `AuthContext.jsx`. Both need settings for a real server.
- [ ] Use a long random `SECRET_KEY` on every machine, and never commit `.env`.

## Suggested next steps

Do saved chats next, because the librarian insights and a good demo both depend on it.

1. Push the current work to GitHub (`git add .`, `git commit`, `git push`), then have a teammate set it up fresh from the README to prove it works on another laptop.
2. Build saved chats (backend: conversation and message repository, service and routes; frontend: load and save chats in `Chat.jsx`).
3. Add "What students are asking" to the Library page.
4. Send librarians and admins to their own page after login.
5. Add `description` to `book_to_text`, re-embed, and re-run the evaluation to compare P@5 and R@5.
6. Finish evaluation layers 2–4 with the group.
7. Add `pytest` tests for the auth, admin and library routes.

**How to run and test:** the [README](README.md) has the full setup. Every time, you need 3 things running: Docker (database), `uvicorn app.main:app --reload --port 8000` in `backend` (with the venv on), and `npm run dev` in `frontend/libraria-app`, with Ollama open. Then open `http://localhost:5173`. Make the first admin with `python -m app.commands.create_admin`, and test the API at `http://localhost:8000/docs`.
