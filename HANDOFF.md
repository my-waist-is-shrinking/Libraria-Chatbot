# Libraria — Project Handoff & Architecture Notes

_Last updated: October 29, 2026 · Maintainer: gio_

<h1 style="font-size: 5.0em;">///////////////// WIP - WORK IN PROGESS //////////////////h1>


## What is Libraria? (Quick recap)

----- to be updated

| Layer | Stack |
| --- | --- |
| **Frontend** | Vite + React, Tailwind CSS, react-router-dom v7, Headless UI, Heroicons, Poppins typography |
| **Backend** | FastAPI, SQLAlchemy 2.0, Pydantic, bcrypt (passwords), PyJWT (token auth) |
| **Database** | PostgreSQL 17 + pgvector running via Docker (`libraria-db`) |
| **Local AI** | Ollama: `nomic-embed-text` (768-dim embeddings) + `llama3.2:3b` or `qwen2.5:3b` (fast local chat) / `qwen2.5:7b` |

The backend strictly follows a 4-tier pattern: **Routes → Services → Repositories → Database Models**. Routes only handle request schemas and responses, services handle business logic, repositories run database queries, and SQLAlchemy models define table structures. Routes never touch the database directly. Database transactions are scoped using FastAPI dependencies (`get_db`) that automatically commit on success and roll back if anything throws an exception.

Our core catalog was loaded from `database/BSCS_Holdings_Cleaned.csv` via `database/import_books.sql`, yielding 178 unique books mapped across 30 CCS courses after removing duplicates.

---

## What we just shipped (Recent updates: Oct 28–29)

1. **Sidebar modularization & refactoring**:
   - Extracted all sidebar code out of `Chat.jsx` into a standalone [`Sidebar.jsx`](frontend/libraria-app/src/components/chat/Sidebar.jsx).
   - Dropped `Chat.jsx` down from **~1,026 lines to 622 lines**, making the active chat view way easier to read and maintain.
2. **Saved chats polish**:
   - **Pinned chats:** Students can pin their go-to conversations to the top of the sidebar. Pinned IDs persist per user in browser `localStorage`.
   - **Inline title renaming:** Users can rename chat threads directly in the sidebar list; updates sync to the backend via `PATCH /api/conversations/{id}`.
   - **Custom delete confirmation:** Swapped out the browser's native `window.confirm` popup for a custom zero-blur modal matching the app's aesthetic.
   - **Full title hover tooltips:** Floating dark tooltip renders on hover over truncated conversation titles.
3. **Responsive mobile off-canvas drawer**:
   - On screens under 768px (`< md:`), the persistent desktop rail switches to an off-canvas drawer with a dark backdrop overlay (`bg-black/40`), opened via a hamburger button in the top header.
4. **Design system & visual polish**:
   - Standardized all typography on the Google Font **Poppins**.
   - Uniform palette: Dusk Lavender (`#4E426D`), Lavender Mist (`#EFEAFC`), Obsidian (`#251E36`), and Slate (`#5C5277`).
   - Welcoming radial dot grid pattern on the new chat screen (`src/styles/backgrounds.css`).
   - Strict zero-blur policy (solid and translucent colors only, no laggy `backdrop-blur-*` filters).
5. **AI 3B guardrails & prompt tuning**:
   - Tuned `backend/app/services/prompts.py` with explicit negative constraints to keep lightweight 3B models (`llama3.2:3b`, `qwen2.5:3b`) fast and strictly in-character without echoing internal prompt tags or developer rules.
   - Replaced raw bracket delimiters like `[1]` with clean `---` dividers in `chat.py`.
6. **RAGAS evaluation pipeline**:
   - Added `backend/app/commands/evaluate_ragas.py` with compatibility shims for running local multi-metric evaluations (faithfulness, answer relevancy, context recall, and context precision).

---

## What we've built so far (Feature breakdown)

All 4 application roles are fully functional end-to-end:

| Role | What they can do | Where to find it |
| --- | --- | --- |
| **Guest** | Chat with the book assistant without an account (sessions aren't saved; a custom modal confirms before "New chat" wipes the screen) | Login page → "Continue as guest" |
| **Student** (`user`) | Register, log in, chat with full **saved chat history** (pin conversations, rename inline, custom delete modal), responsive mobile drawer, update name (Profile), change password (Settings) | `/signup`, `/login`, `/chat`, header profile menu |
| **Librarian** | Everything students can do, plus the **Library page**: add, edit, and delete books; toggle availability; manage physical copy counts; link courses; filter catalog; view stats; import CSVs; and run "Update AI index" | Header menu → Manage books → `/library` |
| **Admin** | Everything librarians can do, plus **User management**: view all user accounts, create librarian or admin profiles, update roles, toggle active status, and trigger password resets | Header menu → Manage users → `/admin` |

### Backend API Map (`http://localhost:8000`, interactive Swagger at `/docs`)

| Route Prefix | Endpoints | Access Level |
| --- | --- | --- |
| `/api/auth` | `POST /login`, `POST /register`, `GET /me`, `PATCH /me`, `POST /change-password` | Public / Authenticated |
| `/api/books` | `GET /api/books?course=` | Public |
| `/api/chat` | `POST /api/chat` (handles RAG search and model generation; saves conversation when logged in) | Public (saved if authenticated) |
| `/api/conversations` | `GET` (fetch saved chats), `GET /{id}/messages` (fetch chat history), `PATCH /{id}` (rename title), `DELETE /{id}` | Authenticated |
| `/api/admin` | `GET` and `POST /users`, `PATCH /users/{id}/role`, `PATCH /users/{id}/status`, `POST /users/{id}/reset-password` | Admin |
| `/api/library` | Books: `GET`, `POST`, `PATCH`, `DELETE` and `POST /books/import` (CSV). Courses: `GET`, `POST`, `PATCH`, `DELETE`. `POST /ai-index` | Librarian & Admin |

---

## Under the hood (How the tricky stuff works)

- **Authentication & Security:** Passwords are saved strictly as bcrypt hashes. Login returns a signed JWT valid for 24 hours. A 401 response forces a client-side logout, and a 403 indicates insufficient role privileges.
- **Saved Chat Lifecycle:** `POST /api/chat` uses `get_optional_user`. If a guest chats, responses stream back but nothing hits the database. If a logged-in user chats, `save_exchange()` creates a conversation on the first prompt (defaulting the title to the first 60 characters) and records the message pair, returning the generated `conversation_id`. Every conversation endpoint strictly verifies owner user IDs to prevent users from accessing each other's chats.
- **Frontend Conversation Handling (`Sidebar.jsx` & `Chat.jsx`):** On page load, `Sidebar.jsx` fetches `GET /api/conversations` (metadata only, excluding message bodies to save bandwidth). When a user clicks a chat, its messages are fetched on demand via `GET /api/conversations/{id}/messages` and cached with a `loaded: true` flag. Starting a new chat assigns a temporary `Date.now()` ID on screen, which is seamlessly swapped for the real DB ID once the first response returns.
- **"Needs AI update" dirty tracking:** Books have an embedding vector (`vector(768)`). When a book is created or its search-critical fields change (title, author, publisher, edition, call number, format, or assigned courses), its embedding is cleared or flagged. Clicking **Update AI index** queries only books missing embeddings and vectors them in batch without re-embedding the entire catalog.
- **CSV batch importing:** The importer maps to `database/BSCS_Holdings_Cleaned.csv` columns, plus optional `DESCRIPTION` and `COPIES`. It detects existing books (matching title + edition), generates course codes automatically, and wraps the entire process in a single database transaction: if any row contains bad data, the entire batch rolls back with line-by-line validation errors.
- **Retrieval accuracy benchmark:** Our baseline evaluation against the 25-query golden set (`backend/evaluation/golden_dataset.csv`) achieved **Precision@5: 0.70** and **Recall@5: 0.82**.

---

## Current project structure

```
Libraria/
├─ docker-compose.yml          PostgreSQL 17 + pgvector service
├─ database/
│  ├─ schema.sql                Database tables (users, courses, books, copies, book_courses, conversations, messages)
│  ├─ import_books.sql          CSV cleanup & staging script
│  └─ BSCS_Holdings_Cleaned.csv Cleaned BSCS holdings dataset
├─ backend/app/
│  ├─ main.py                   FastAPI initialization & router bindings
│  ├─ core/config.py            Settings & environment variables (DATABASE_URL, SECRET_KEY, Ollama)
│  ├─ db/                       Database session (get_db) & SQLAlchemy models (models.py)
│  ├─ schemas/                  Pydantic schemas (user.py, book.py, chat.py, conversation.py)
│  ├─ repositories/             Direct database queries (user.py, book.py, course.py, conversation.py)
│  ├─ services/                 Business logic (auth, admin, library, book, chat, conversation, llm, prompts)
│  ├─ api/                      Dependencies (get_current_user, get_optional_user, require_roles) & route modules
│  └─ commands/                 Management tasks (create_admin, embed_books, evaluate_retrieval, evaluate_ragas)
└─ frontend/libraria-app/src/
   ├─ App.jsx                   Main app routing & protected route wrappers
   ├─ context/AuthContext.jsx   Global auth provider, authFetch helper, profile/password handlers
   ├─ styles/backgrounds.css    Radial dot grid background rules
   ├─ pages/auth/               LoginPage, SignUpPage
   ├─ pages/admin/              AdminUsersPage (staff management)
   ├─ pages/librarian/          LibraryPage (catalog & course manager)
   ├─ components/chat/          Chat (main viewport), Sidebar (desktop rail & mobile drawer), ChatMessage, BookSearchPanel
   ├─ components/account/       AccountModal (Profile & Settings tabs), LoginModal
   └─ components/librarian/     BookForm, CoursesPanel
```

---

## What's done vs. What's left (Sprint checklist)

### Completed:
- [x] **Inline chat rename:** `PATCH /api/conversations/{id}` with inline editing in the sidebar.
- [x] **Mobile-ready navigation:** Sidebar drawer sliding off-canvas with backdrop overlay on mobile screens (`< 768px`).
- [x] **Custom delete confirmation modal:** Clean zero-blur modal instead of browser alerts.
- [x] **Sidebar refactoring:** Modularized into `Sidebar.jsx`, cutting `Chat.jsx` size almost in half.
- [x] **Pin chats to top:** Per-user pinned chat list stored in `localStorage`.
- [x] **3B model leakage fix:** Tightened prompt templates to prevent smaller models from echoing instructions.
- [x] **RAGAS evaluation pipeline:** Added `evaluate_ragas.py` script.

### High priority backlog:
- [ ] **End-to-end testing for saved chats:** Manually run through multi-user edge cases (login, consecutive messages, refresh reload, delete persistence, guest isolation).
- [ ] **"What students are asking" librarian dashboard:** Group common query topics and surface questions where zero relevant books were retrieved so librarians know what holdings to purchase.
- [ ] **Smart post-login redirection:** Send librarians directly to `/library` and admins to `/admin` instead of defaulting everyone to `/chat`.
- [ ] **Golden set review & RAGAS benchmarking:** Review the 25-query golden dataset with advisors and generate benchmark metrics with `evaluate_ragas.py`.

### Medium priority (AI quality & code health):
- [ ] **Include book descriptions in search text:** Add `description` to `book_to_text` (in `services/book.py`) and re-embed to improve semantic search match rates.
- [ ] **Availability-aware context:** Include physical copy availability in the LLM prompt so it warns students if a title is currently checked out.
- [ ] **Progress feedback on "Update AI index":** Add progress indicators or WebSocket updates for large embedding batches.
- [ ] **Automated test suite:** Add `pytest` test suites covering auth, library, and conversation routes.

### Security notes before deploying outside localhost:
- [ ] JWT tokens are stored in `localStorage` (24-hour expiration, no refresh token rotation).
- [ ] Rate limiting is not yet enabled on the login or chat endpoints.
- [ ] CORS currently allows `http://localhost:5173`, and the API base URL is hardcoded in frontend service calls.
- [ ] Always generate an independent, cryptographically secure `SECRET_KEY` per machine and keep `.env` excluded from source control.

---

## Where to pick up next

1. **Commit current progress to GitHub:**
   ```powershell
   git add .
   git commit -m "Update docs, modularize sidebar, add mobile drawer, and refine prompt guardrails"
   git push
   ```
2. **Build the "What students are asking" widget:** Query the `messages` table for recent queries and unfulfilled searches, and display them in `LibraryPage.jsx`.
3. **Set up login redirects:** Update `LoginPage.jsx` to navigate to `/library` for librarians and `/admin` for admins based on `user.role`.
4. **Run RAGAS evaluation:** Execute `python -m app.commands.evaluate_ragas` to collect faithfulness and context recall metrics.
5. **Write `pytest` suites:** Add backend unit and route tests under `backend/tests/`.
