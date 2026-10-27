# LIBRARIA

**AI Assistant for Book Retrieval and Enhanced Book Recommendation for CCS Students**

Libraria is a chatbot that recommends books from the CCS library. It uses **RAG
(Retrieval-Augmented Generation)**: it first searches the library database for
matching books, then lets a local AI write a reply using **only** those books.

| Part | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS, React Router, Headless UI |
| Backend | Python + FastAPI, SQLAlchemy, bcrypt (passwords), PyJWT (login tokens) |
| Database | PostgreSQL + pgvector (runs in Docker) |
| AI | Ollama (runs offline on your laptop): `nomic-embed-text` + `llama3.2:3b` or `qwen2.5:7b` |

---

> **Project status and to-do list:** see [HANDOFF.md](HANDOFF.md) (what's done, what's lacking, next steps).

---

## What it can do (by role)

| Role | Can do | Where |
|---|---|---|
| **Guest** | Chat with the book assistant without an account (nothing is saved) | Login page → **Continue as Guest** |
| **Student** (`user`) | Sign up, log in, chat, **saved chats** (your past chats stay in the sidebar; reopen or delete them), change their name (**Profile**) and password (**Settings**) | Click your name at the bottom of the sidebar |
| **Librarian** | Everything a student can + the **Library page**: add / edit / delete books, availability, number of copies, courses, search and filters, stats, **Import CSV**, **Update AI index** | Menu → **Manage books** (`/library`) |
| **Admin** | Everything a librarian can + **Manage users**: create librarian/admin accounts, change roles, activate/deactivate, reset passwords | Menu → **Manage users** (`/admin`) |

Students sign up themselves (always as a normal `user`). Librarian and admin accounts are
made by an admin.

---

## 1. Install these first (one time only)

| Tool | Download | Check it works (in PowerShell) |
|---|---|---|
| Git | https://git-scm.com | `git --version` |
| Docker Desktop | https://www.docker.com/products/docker-desktop | `docker --version` |
| Python 3.10+ | https://www.python.org (tick **"Add Python to PATH"**) | `python --version` |
| Node.js (LTS) | https://nodejs.org | `node --version` |
| Ollama | https://ollama.com | `ollama --version` |

> **Windows 11 note:** if Python later shows `DLL load failed ... An Application Control
> policy has blocked this file`, turn off **Smart App Control** in
> Windows Security → App & browser control. See [Troubleshooting](#troubleshooting).

---

## 2. Get the code

```
git clone https://github.com/my-waist-is-shrinking/Libraria-Chatbot.git
cd Libraria-Chatbot
```

(The folder name is whatever `git clone` made. The steps below call it the `Libraria` folder.)

---

## 3. Start the database

1. Open **Docker Desktop** and wait for **"Engine running"** (bottom-left).
2. In the `Libraria` folder:

```
docker compose up -d
```

This creates the PostgreSQL database with all tables (from `database/schema.sql`).

### Load the books (one time only)

Still in the `Libraria` folder, run these **one at a time**:

```
docker cp database/BSCS_Holdings_Cleaned.csv libraria-db:/tmp/holdings.csv
docker cp database/import_books.sql libraria-db:/tmp/import_books.sql
docker exec libraria-db psql -U libraria -d libraria -f /tmp/import_books.sql
```

The last command prints the number of courses and books. You should see **30 courses**
and **178 books**.

### Already had the database from before? (update it once)

`schema.sql` only runs the **first** time the database is created. If your database is
older than the **copies** feature, add the new column once:

```
docker exec -it libraria-db psql -U libraria -d libraria -c "ALTER TABLE books ADD COLUMN copies INT NOT NULL DEFAULT 1 CHECK (copies >= 0);"
```

It prints `ALTER TABLE`. If it says the column **already exists**, you're fine.

---

## 4. Set up the AI models (one time only)

Make sure the Ollama app is running (llama icon near the clock), then:

```
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

If your laptop has **16 GB RAM or more**, also run `ollama pull qwen2.5:7b` (smarter, but slower).

---

## 5. Set up the backend (one time only)

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

**Make your own secret key** (it signs the login tokens). Run this, copy the long text it prints:

```
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `backend\.env` and paste it after `SECRET_KEY=` (replace `change-me...`). Save the file.

If you pulled `qwen2.5:7b`, also set `CHAT_MODEL=qwen2.5:7b` in `backend\.env`.

Then turn every book into an AI embedding (takes about a minute):

```
python -m app.commands.embed_books
```

It should end with **"All books embedded!"**.

### Create the first admin account (one time only)

Still in `backend` with `(venv)` on:

```
python -m app.commands.create_admin
```

Type a name, email and password (the password is hidden while you type, that's normal),
then press **Enter** at `Role [admin]`. Log in with this account, then use
**Manage users** to make librarian accounts.

---

## 6. Set up the frontend (one time only)

Open a **second** PowerShell window:

```
cd Libraria\frontend\libraria-app
npm install
```

---

## 7. Run Libraria (every time)

You need **3 things running** (plus the Ollama app):

| # | What | Where | Command |
|---|---|---|---|
| 1 | Database | Docker Desktop open | (starts by itself; if not: `docker compose up -d` in `Libraria`) |
| 2 | Backend | PowerShell in `Libraria\backend` | `venv\Scripts\activate` then `uvicorn app.main:app --reload --port 8000` |
| 3 | Frontend | PowerShell in `Libraria\frontend\libraria-app` | `npm run dev` |

Then open **http://localhost:5173**.

- **Continue as Guest** → chat without an account (not saved).
- **Sign up** → make a student account.
- **Log in** → students go to the chat. Your saved chats show in the left sidebar: click one to
  reopen it, or click the trash icon to delete it. Click your name (bottom-left) for Profile,
  Settings, and (for staff) **Manage books** / **Manage users**.

Useful pages:
- http://localhost:8000/api/health → shows the server is running and which AI model it uses
- http://localhost:8000/docs → test the API directly (log in with `POST /api/auth/login`,
  copy the `access_token`, click **Authorize** and paste it)

---

## 8. Librarian tips

- **New or edited books** get a yellow **"Needs AI update"** badge. Press
  **Update AI index** (Ollama must be running) so the chatbot can find them.
- **Import CSV** uses the same columns as `database/BSCS_Holdings_Cleaned.csv`:
  `PROFESSIONAL SUBJECTS, CALL NUMBER, AUTHOR, TITLE, EDITION, PUBLISHER`, plus optional
  `DESCRIPTION` and `COPIES`. Only `TITLE` is required.
  - Courses look like `CC-COMPROG11 - Computer Programming 1`; several courses are split with ` / `.
    New course codes are created automatically.
  - `E-Book` in `CALL NUMBER` makes the book an e-book.
  - Books that already exist (same title + edition) are skipped.
  - If any row has a problem, **nothing** is imported and the page lists the rows to fix.
  - In Excel, save with **Save As → CSV UTF-8** so letters like ñ stay correct.

---

## 9. Evaluation (accuracy test)

Checks how well the book search works, using the answer key in
`backend/evaluation/golden_dataset.csv`:

```
cd backend
venv\Scripts\activate
python -m app.commands.evaluate_retrieval
```

It prints **Precision@5, Recall@5, Hit Rate@5** and the average search time, and saves
details to `backend/evaluation/retrieval_results.csv`.

---

## Project structure

```
Libraria/
├── docker-compose.yml              ← runs PostgreSQL + pgvector
├── database/
│   ├── schema.sql                  ← creates the tables
│   ├── import_books.sql            ← loads + cleans the book CSV
│   └── BSCS_Holdings_Cleaned.csv
├── backend/                        ← FastAPI
│   ├── .env.example                ← copy to .env (never upload .env)
│   ├── requirements.txt
│   ├── evaluation/                 ← answer key + results
│   └── app/
│       ├── main.py                 ← starts the API, registers the routes
│       ├── core/config.py          ← reads .env
│       ├── db/                     ← database connection (get_db) + tables (models.py)
│       ├── schemas/                ← what the API sends/receives (user, book, chat, conversation)
│       ├── repositories/           ← the only code that talks to the database (user, book, course, conversation)
│       ├── services/               ← logic: auth, admin, library, RAG chat, saved chats, prompts, Ollama
│       ├── api/deps.py             ← "who is logged in?" + role checks (guests allowed where needed)
│       ├── api/routes/             ← URLs: /api/auth, /api/admin, /api/library, /api/books, /api/chat, /api/conversations
│       └── commands/               ← scripts (create_admin, embed_books, evaluate_retrieval)
└── frontend/libraria-app/src/      ← React app
    ├── App.jsx                     ← pages + who can open them
    ├── context/AuthContext.jsx     ← login state, authFetch (sends the token)
    ├── pages/
    │   ├── auth/                   ← LoginPage, SignUpPage
    │   ├── admin/                  ← AdminUsersPage (Manage users)
    │   └── librarian/              ← LibraryPage (Manage books)
    └── components/
        ├── chat/                   ← Chat (with the saved-chats sidebar), ChatMessage, BookSearchPanel
        ├── account/                ← AccountModal (Profile + Settings), LoginModal
        └── librarian/              ← BookForm, CoursesPanel
```

Code rule (from the template we follow): **routes → services → repositories → database**.
Routes never talk to the database directly.

### Main API routes

| Prefix | What | Who |
|---|---|---|
| `/api/auth` | `login`, `register`, `me` (GET / PATCH), `change-password` | anyone / logged in |
| `/api/chat`, `/api/books` | the chatbot (saves the chat when you're logged in) and the public book list | anyone |
| `/api/conversations` | my saved chats: list, load one chat's messages, delete | logged in |
| `/api/admin/users` | list, create, change role, activate/deactivate, reset password | admin |
| `/api/library` | books (CRUD + `books/import`), courses (CRUD), `ai-index` | librarian + admin |

---

## Working together with Git

**Before you start working:**
```
git pull
```

**After you finish something:**
```
git add .
git commit -m "Short description of what you changed"
git push
```

If `git push` is rejected, run `git pull` first, then push again.

**Never upload:** `.env`, `venv/`, `node_modules/` (the `.gitignore` file already blocks them).

After a `git pull`, if `requirements.txt` changed run `pip install -r requirements.txt`
(in `backend`, venv on), and if `package.json` changed run `npm install` (in `frontend/libraria-app`).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `No module named ...` | You forgot `venv\Scripts\activate` (the prompt must start with `(venv)`), or run `pip install -r requirements.txt` again. |
| `secret_key Field required` | Your `backend\.env` has no `SECRET_KEY=` line. Add it (step 5) and restart uvicorn. |
| `column books.copies does not exist` | Your database is older than the copies feature. Run the `ALTER TABLE` command in step 3. |
| `failed to connect to the docker API` | Open Docker Desktop and wait for "Engine running". |
| `password authentication failed for user "libraria"` | Another PostgreSQL is installed on your laptop and using port 5432. Uninstall it, or change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` and `5432` to `5433` in `backend\.env`. |
| `DLL load failed ... Application Control policy has blocked this file` | Windows Smart App Control is blocking Python packages. Turn it off in Windows Security → App & browser control. |
| `running scripts is disabled on this system` | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Chat says "Sorry, there was an error..." | Check that the backend (uvicorn) and Ollama are running, and look at the uvicorn window for the red error. |
| Saved chats don't show in the sidebar after logging in | Make sure the backend is running, then open the browser's Network tab (F12) and look at the `conversations` request. A 401 means log in again. "No chats yet" is normal for an account that hasn't sent a message. |
| Page turns white after editing `Chat.jsx` | Press F12 → Console and read the first red error. It is usually a missing import (like `TrashIcon`) or a duplicate import line. |
| "Couldn't reach the AI" on **Update AI index** | Open the Ollama app, then press the button again. |
| "Your session expired. Please log in again." | Login tokens last 24 hours. Just log in again. |
| Changed `.env` but nothing changed | Restart uvicorn (`Ctrl+C`, then run it again). `--reload` does not watch `.env`. |
| `(END)` appears and the terminal seems stuck | Press `q`. |