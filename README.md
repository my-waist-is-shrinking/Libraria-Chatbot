# LIBRARIA

**AI Assistant for Book Retrieval and Enhanced Book Recommendation for CCS Students**

Libraria is a chatbot that recommends books from the CCS library. It uses **RAG
(Retrieval-Augmented Generation)**: it first searches the library database for
matching books, then lets a local AI write a reply using **only** those books.

| Part | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL + pgvector (runs in Docker) |
| AI | Ollama (runs offline on your laptop): `nomic-embed-text` + `llama3.2:3b` or `qwen2.5:7b` |

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
git clone <REPO-URL>
cd Libraria
```

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

If you pulled `qwen2.5:7b`, open `backend\.env` and set `CHAT_MODEL=qwen2.5:7b`.

Then turn every book into an AI embedding (takes about a minute):

```
python -m app.commands.embed_books
```

It should end with **"All books embedded!"**.

---

## 6. Set up the frontend (one time only)

Open a **second** PowerShell window:

```
cd Libraria\frontend\libraria-app
npm install
```

---

## 7. Run Libraria (every time)

You need **3 things running**:

| # | What | Where | Command |
|---|---|---|---|
| 1 | Database | Docker Desktop open | (starts by itself; if not: `docker compose up -d` in `Libraria`) |
| 2 | Backend | PowerShell in `Libraria\backend` | `venv\Scripts\activate` then `uvicorn app.main:app --reload --port 8000` |
| 3 | Frontend | PowerShell in `Libraria\frontend\libraria-app` | `npm run dev` |

Then open **http://localhost:5173**.

- **Continue as Guest** → chat without saving.
- **Log in** → for now any email + password works (login is not connected to the database yet).

Useful pages:
- http://localhost:8000/api/health → shows the server is running and which AI model it uses
- http://localhost:8000/docs → test the API directly

---

## 8. Evaluation (accuracy test)

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
├── docker-compose.yml          ← runs PostgreSQL + pgvector
├── database/
│   ├── schema.sql              ← creates the tables
│   ├── import_books.sql        ← loads + cleans the book CSV
│   └── BSCS_Holdings_Cleaned.csv
├── backend/                    ← FastAPI
│   ├── .env.example            ← copy to .env (never upload .env)
│   ├── requirements.txt
│   ├── evaluation/             ← answer key + results
│   └── app/
│       ├── main.py             ← starts the API
│       ├── core/config.py      ← reads .env
│       ├── db/                 ← database connection + tables
│       ├── schemas/            ← what the API sends/receives
│       ├── repositories/       ← the only code that talks to the database
│       ├── services/           ← logic: RAG, prompts, Ollama
│       ├── api/routes/         ← URLs (/api/books, /api/chat)
│       └── commands/           ← scripts (embed_books, evaluate_retrieval)
└── frontend/libraria-app/      ← React app
```

Code rule (from the template we follow): **routes → services → repositories → database**.
Routes never talk to the database directly.

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

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `No module named ...` | You forgot `venv\Scripts\activate` (the prompt must start with `(venv)`). |
| `failed to connect to the docker API` | Open Docker Desktop and wait for "Engine running". |
| `password authentication failed for user "libraria"` | Another PostgreSQL is installed on your laptop and using port 5432. Uninstall it, or change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` and `5432` to `5433` in `backend\.env`. |
| `DLL load failed ... Application Control policy has blocked this file` | Windows Smart App Control is blocking Python packages. Turn it off in Windows Security → App & browser control. |
| `running scripts is disabled on this system` | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Chat says "Sorry, there was an error..." | Check that the backend (uvicorn) and Ollama are running, and look at the uvicorn window for the red error. |
| Changed `.env` but nothing changed | Restart uvicorn (`Ctrl+C`, then run it again). `--reload` does not watch `.env`. |
| `(END)` appears and the terminal seems stuck | Press `q`. |