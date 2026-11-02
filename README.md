# LIBRARIA

> ### ⚠️ **STATUS: WORK IN PROGRESS (WIP)**
> *This system is currently under active development and testing. Architecture, model integrations, and feature sets are actively being refined.*

---

## Project Scope
**An AI Assisted Book Retrieval and Enhanced Book Recommendation for CCS Academic Library**

Libraria is an intelligent, full-stack academic library assistant engineered specifically for the **College of Computer Studies (CCS)**. It bridges physical library holdings and digital resources with semantic AI search, curriculum-aware recommendations, and catalog verification.

---

## System Architecture & Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React (Vite) + Tailwind CSS | React Router v7, Headless UI, Heroicons, Google Fonts (**Poppins**), strict zero-blur design policy |
| **Backend** | Python 3.10+ & FastAPI | 4-tier architecture (Routes → Services → Repositories → DB Models), SQLAlchemy 2.0, bcrypt, PyJWT |
| **Database** | PostgreSQL + `pgvector` | Hosted on **Supabase Cloud** (AWS Singapore) with local Docker PostgreSQL support |
| **AI / RAG Pipeline** | Hybrid Cloud & Local AI | **Embedding:** Ollama `nomic-embed-text` (768-dim vectors)<br>**LLM Chat:** Google Gemini API (`gemini-3.1-flash-lite`) with local Ollama (`qwen2.5:3b` / `llama3.2:3b`) offline fallback |
| **Cloud Bridge / Tunnel** | Cloudflare Tunnel (`cloudflared`) | Clean, secure HTTPS tunnel bypassing telco DNS blocks (replaces ngrok) |
| **Hosting (Preview)** | Vercel | Frontend deployed with offline fallback catalog (`fallbackBooks.json`) |

---

## Role-Based Access Control (RBAC)

| Role | Capabilities | Primary Interface |
|---|---|---|
| **Guest** | Chat with the book assistant without an account (stateless sessions; confirm modal before clearing) | Login page → **Continue as Guest** |
| **Student** (`user`) | Register, log in, chat with persistent **saved chat history** (pin conversations, rename inline, delete modal), responsive mobile off-canvas drawer, update profile, change password | `/signup`, `/login`, `/chat` |
| **Librarian** | Everything students can do, plus access to **Library Management**: add/edit/delete books, physical copy tracking, toggle availability, course linkage, batch CSV import, and trigger **Update AI index** | Menu → **Manage books** (`/library`) |
| **Admin** | Everything librarians can do, plus **User Administration**: provision staff accounts, change user roles, activate/deactivate accounts, and trigger password resets | Menu → **Manage users** (`/admin`) |

---

## Core Capabilities

1. **Semantic RAG Search (pgvector):**  
   Converts student queries into 768-dimensional vectors using `nomic-embed-text` and executes cosine similarity distance queries (`<=>`) directly against indexed library holdings in Supabase.

2. **Multilingual Language Matching:**  
   The AI assistant mirrors the user's initiated language (English, conversational Taglish, or Bisaya/Cebuano) without awkward or forced translations for technical CS terms (e.g. *database, arrays, recursion, inheritance*).

3. **Deterministic Fact-Checking (`/verify <title>`):**  
   A direct database lookup command that bypasses the LLM completely to fact-check whether a recommended title exists in the physical or digital collection, eliminating hallucinations.

4. **Curriculum Alignment:**  
   Every book is linked to relevant CCS courses (e.g., *CC-COMPROG11*, *CS-DASTRUC21*, *CS-INFOSEC32*), allowing subject-targeted discovery.

---

## Getting Started (Local Setup)

### 1. Prerequisites
- **Python 3.10+** (with virtual environment support)
- **Node.js (LTS)**
- **Ollama** (running locally with `nomic-embed-text` installed)
- **Supabase Cloud Project** or **Docker Desktop** (PostgreSQL 17 + `pgvector`)

### 2. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Configure `backend/.env`:
```env
DATABASE_URL="postgresql+psycopg://postgres.[project-ref]:[PASSWORD]@[host]:6543/postgres"
SECRET_KEY="your-secret-key-here"
OLLAMA_URL="http://localhost:11434"
EMBED_MODEL="nomic-embed-text"
CHAT_MODEL="qwen2.5:3b"
GEMINI_API_KEY="your-gemini-api-key"
```

Seed the database and generate vector embeddings:
```powershell
# 1. Seed 29 courses and 178 books from holdings CSV
python -m app.commands.seed_books

# 2. Compute 768-dim vector embeddings
python -m app.commands.embed_books

# 3. Create your initial admin account
python -m app.commands.create_admin
```

Start the backend:
```powershell
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```powershell
cd frontend/libraria-app
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Evaluation & Metrics

The system includes a dedicated evaluation harness located in `backend/app/commands/`:
- **`benchmark_chat.py`**: Measures real-time latency breakdowns across Ollama embedding, Supabase vector retrieval, and LLM generation.
- **`evaluate_retrieval.py`**: Evaluates precision and recall against the 25-query golden test dataset (`golden_dataset.csv`).
- **`evaluate_ragas.py`**: Framework for evaluating faithfulness, answer relevancy, and context recall.

---

## Project Documentation
- Detailed sprint progress, architectural decisions, and current backlog: [**HANDOFF.md**](HANDOFF.md)
