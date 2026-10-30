# LIBRARIA

**An AI Assisted Book Retrieval and Enhanced Book Recommendation for CCS Academic Library**

<h1 style="font-size: 5.0em;">**WIP - WORK IN PROGESS**</h1>
<div style="padding: 5.0em;"></div>

| Layer | Stack |
|---|---|
| **Frontend** | React (Vite) + Tailwind CSS, React Router v7, Headless UI, Heroicons, Poppins font |
| **Backend** | Python 3.10+ with FastAPI, SQLAlchemy 2.0, bcrypt, PyJWT |
| **Database** | PostgreSQL 17 + pgvector running inside Docker |
| **AI / LLM** | Ollama (offline): `nomic-embed-text` (768-dim embeddings) + `llama3.2:3b` or `qwen2.5:3b` (fast chat) / `qwen2.5:7b` |

---

> **Team handoff & roadmap:** Looking for current progress, architecture notes, and next priorities? Check out [**HANDOFF.md**](HANDOFF.md).

---

## Who gets to do what (Role Breakdown)

| Role | What they can do | Where |
|---|---|---|
| **Guest** | Chat with the assistant without an account (sessions aren't saved; confirms before clearing chats) | Login page → **Continue as Guest** |
| **Student** (`user`) | Register, log in, chat with full **saved chat history** (pin favourites, inline rename, delete), mobile off-canvas drawer, update **Profile** and change password in **Settings** | Sidebar & header profile menu |
| **Librarian** | Everything students can do, plus access to the **Library management dashboard**: add/edit/delete books, toggle availability, manage copies, link courses, import CSV batches, and trigger **Update AI index** | Menu → **Manage books** (`/library`) |
| **Admin** | Everything librarians can do, plus user administration: create staff accounts, toggle roles, activate/deactivate users, and trigger password resets | Menu → **Manage users** (`/admin`) |

*Note: Students sign up through the standard register page. Librarian and Admin accounts are provisioned by an Admin.*

---

## 1. Prerequisites (Install once)

Before starting, make sure you have these tools installed on your machine:

| Tool | Download Link | Quick Check (PowerShell) |
|---|---|---|
| **Git** | https://git-scm.com | `git --version` |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | `docker --version` |
| **Python 3.10+** | https://www.python.org (make sure to check **"Add Python to PATH"**) | `python --version` |
| **Node.js (LTS)** | https://nodejs.org | `node --version` |
| **Ollama** | https://ollama.com | `ollama --version` |

> **Windows 11 note:** If Python throws a `DLL load failed ... Application Control policy has blocked this file` error, Smart App Control is blocking virtualenv packages. Turn it off in **Windows Security → App & browser control**.

---

## 2. Clone the repo

```powershell
git clone https://github.com/my-waist-is-shrinking/Libraria-Chatbot.git
cd Libraria-Chatbot
```

*(From here on, this directory is referred to as the root `Libraria` folder).*

---

## 3. Spin up the database (Docker)

1. Open **Docker Desktop** and make sure the engine is running.
2. In the root `Libraria` folder, start PostgreSQL:

```powershell
docker compose up -d
```

This runs PostgreSQL 17 with the pgvector extension and automatically initializes tables from `database/schema.sql`.

### Seed the book catalog (one-time setup)

In the root `Libraria` folder, run these commands to import the cleaned CCS holdings:

```powershell
docker cp database/BSCS_Holdings_Cleaned.csv libraria-db:/tmp/holdings.csv
docker cp database/import_books.sql libraria-db:/tmp/import_books.sql
docker exec libraria-db psql -U libraria -d libraria -f /tmp/import_books.sql
```

The script will clean duplicates, assign courses, and print the loaded totals. You should see **30 courses** and **178 books**.

### Upgrading an older local database?
If your local DB container was initialized before the multi-copy feature was added, run this once:

```powershell
docker exec -it libraria-db psql -U libraria -d libraria -c "ALTER TABLE books ADD COLUMN copies INT NOT NULL DEFAULT 1 CHECK (copies >= 0);"
```

---

## 4. Pull the local AI models (Ollama)

With Ollama running in your system tray, pull the embedding model and our default chat model:

```powershell
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

*Have 16 GB+ RAM?* You can also pull `qwen2.5:3b` or `qwen2.5:7b` if you want higher reasoning capacity.

---

## 5. Backend setup (FastAPI)

Open a PowerShell window in `backend`:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Generate a random secret key for signing JWT login tokens:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `backend\.env` and paste that generated string into `SECRET_KEY=`.

If you prefer using Qwen or Llama, verify your `CHAT_MODEL` entry:
```env
CHAT_MODEL=llama3.2:3b
```

Generate vector embeddings for all books in the database (takes ~1 minute):

```powershell
python -m app.commands.embed_books
```

You should see it finish with **"All books embedded!"**.

### Create your first Admin account

With `(venv)` active in `backend`:

```powershell
python -m app.commands.create_admin
```

Follow the prompts for name, email, and password, and press Enter to accept `admin`. You can use this account to log in and promote teammates to librarians.

---

## 6. Frontend setup (React + Vite)

Open a second PowerShell window:

```powershell
cd frontend\libraria-app
npm install
```

---

## 7. Running the project (Everyday dev workflow)

You'll need these 3 services running side by side:

| Service | Location | Terminal Command |
|---|---|---|
| **1. Database** | Docker Desktop | Runs in background (`docker compose up -d` if stopped) |
| **2. Backend** | `Libraria\backend` | `venv\Scripts\activate`<br>`uvicorn app.main:app --reload --port 8000` |
| **3. Frontend** | `Libraria\frontend\libraria-app` | `npm run dev` |

Then hit **http://localhost:5173** in your browser.

- **Check API status:** http://localhost:8000/api/health
- **Interactive Swagger Docs:** http://localhost:8000/docs (Authorize using your JWT token from `/api/auth/login`)

---

## 8. Librarian features & catalog management

- **Automatic AI sync flags:** When a book is added or its metadata changes, it gets flagged with a yellow **"Needs AI update"** badge. Clicking **Update AI index** re-embeds only the dirty books.
- **CSV Batch Import:** You can bulk-upload records using the CSV layout in `database/BSCS_Holdings_Cleaned.csv` (`PROFESSIONAL SUBJECTS, CALL NUMBER, AUTHOR, TITLE, EDITION, PUBLISHER, DESCRIPTION, COPIES`).
  - Titles are matched so duplicate editions are skipped.
  - New course codes are auto-created on the fly.
  - Transactions are all-or-nothing: if row 25 is corrupted, the whole batch safely rolls back with a detailed line-error list.
  - Save spreadsheet files as **CSV UTF-8** in Excel to preserve special characters.

---

## 9. Testing retrieval accuracy

To benchmark how well our vector similarity search locates the right books for student questions, we test against the ground-truth answer key in `backend/evaluation/golden_dataset.csv`:

```powershell
cd backend
venv\Scripts\activate
python -m app.commands.evaluate_retrieval
```

This outputs **Precision@5, Recall@5, Hit Rate@5**, and execution latency, saving a breakdown to `backend/evaluation/retrieval_results.csv`.

To run multi-layer RAG evaluation (faithfulness and answer relevancy) using RAGAS:
```powershell
python -m app.commands.evaluate_ragas
```

---

## 10. Project architecture & code map

We follow a clean 4-tier separation: **Routes → Services → Repositories → DB Models**. Routes handle request validation, services enforce business logic, repositories execute database queries, and routes never talk to PostgreSQL directly.

```
Libraria/
├── docker-compose.yml              ← PostgreSQL 17 + pgvector container
├── database/
│   ├── schema.sql                  ← Complete table schemas
│   ├── import_books.sql            ← CSV cleaning & loading logic
│   └── BSCS_Holdings_Cleaned.csv
├── backend/                        ← FastAPI server
│   ├── .env.example                ← Template configuration (never commit .env)
│   ├── requirements.txt
│   ├── evaluation/                 ← Test dataset & CSV evaluation logs
│   └── app/
│       ├── main.py                 ← FastAPI entry point & CORS configuration
│       ├── core/config.py          ← Pydantic settings & env loader
│       ├── db/                     ← DB engine, SessionLocal, and models.py
│       ├── schemas/                ← Pydantic request & response schemas
│       ├── repositories/           ← Raw SQL / SQLAlchemy queries
│       ├── services/               ← Business rules: auth, admin, chat RAG, Ollama client
│       ├── api/deps.py             ← Auth guards & dependency injection
│       ├── api/routes/             ← Route controllers (/auth, /chat, /library, /admin, etc.)
│       └── commands/               ← CLI tasks (create_admin, embed_books, evaluate_*)
└── frontend/libraria-app/src/      ← React + Vite frontend
    ├── App.jsx                     ← Route provider & role-based route wrappers
    ├── context/AuthContext.jsx     ← Auth state, token persistence & authFetch helper
    ├── styles/backgrounds.css      ← Custom pattern rules (welcome screen radial dot grid)
    ├── pages/
    │   ├── auth/                   ← LoginPage, SignUpPage
    │   ├── admin/                  ← AdminUsersPage (account provisioning)
    │   └── librarian/              ← LibraryPage (catalog manager)
    └── components/
        ├── chat/                   ← Chat, Sidebar (drawer & rail), ChatMessage, BookSearchPanel
        ├── account/                ← AccountModal (Profile/Settings), LoginModal
        └── librarian/              ← BookForm, CoursesPanel
```

### Core API Endpoints

| Prefix | Endpoints | Access |
|---|---|---|
| `/api/auth` | `login`, `register`, `me` (GET/PATCH), `change-password` | Public / Logged in |
| `/api/chat`, `/api/books` | Chat streaming & RAG exchange; public catalog search | Public (saved if logged in) |
| `/api/conversations` | Conversation history: list, read messages, rename title, delete | Logged in |
| `/api/admin/users` | List accounts, create staff, update roles, toggle status, reset password | Admin |
| `/api/library` | Book CRUD + CSV import, course CRUD, AI re-index trigger | Librarian & Admin |

---

## 11. Team Git Workflow

Before starting a feature:
```powershell
git pull
```

When you're ready to share your changes:
```powershell
git add .
git commit -m "Brief description of what you changed"
git push
```

- **Protected files:** Never commit `.env`, `venv/`, or `node_modules/` (`.gitignore` handles this automatically).
- If backend dependencies changed after pulling: run `pip install -r requirements.txt` (inside `venv`).
- If frontend packages changed: run `npm install` inside `frontend/libraria-app`.

---

## 12. Common hiccups & quick fixes

| What went wrong | How to fix it |
|---|---|
| `No module named ...` | Virtual environment isn't active. Run `venv\Scripts\activate` (look for `(venv)` in your prompt) or run `pip install -r requirements.txt`. |
| `secret_key Field required` | Your `backend\.env` is missing the `SECRET_KEY=` line. Generate one (Step 5) and restart Uvicorn. |
| `column books.copies does not exist` | Your local DB was created with an old schema. Run the `ALTER TABLE` snippet in Step 3. |
| `failed to connect to the docker API` | Docker Desktop isn't running yet. Start it and wait for the green indicator. |
| `password authentication failed for user "libraria"` | Another PostgreSQL instance on your computer is already hogging port 5432. Stop it, or map `"5433:5432"` in `docker-compose.yml` and update `DATABASE_URL` in `.env`. |
| `DLL load failed ... Application Control policy has blocked this file` | Windows Smart App Control blocked a Python binary. Disable it under Windows Security → App & browser control. |
| Chat says *"Sorry, there was an error..."* | Check that both Uvicorn and the Ollama app are running. Look at the terminal running Uvicorn for the specific traceback. |
| Saved chats don't load after logging in | Check your browser console (F12) and Network tab. A 401 error means your token expired; just log in again. |
| Model seems sluggish on a laptop | Make sure you're using a 3B parameter model like `llama3.2:3b` or `qwen2.5:3b` in your `.env` instead of heavy 7B+ models. |
