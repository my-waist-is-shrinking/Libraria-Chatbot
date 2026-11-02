# Libraria — Project Handoff & Architecture Notes

_Maintainer: gio · Project Status: Active Development_

> ### ⚠️ **STATUS: WORK IN PROGRESS (WIP)**
> *This documentation reflects ongoing development for the course capstone / project. Specific modules, cloud configurations, and evaluation benchmarks are continuously updated.*

---

## Project Scope
**An AI Assisted Book Retrieval and Enhanced Book Recommendation for CCS Academic Library**

Libraria is an AI-assisted library discovery and recommendation platform tailored for students, faculty, and staff of the College of Computer Studies (CCS). It indexes physical holding records and digital e-books, providing grounded recommendations linked directly to specific CCS subjects.

---

## System Architecture

```
[Student / Patrons on Web/Mobile]
              │
              ▼
    ( Vercel Frontend UI )
       [React + Vite + Tailwind]
              │
              ├──> (Offline Catalog Fallback) [fallbackBooks.json]
              │
              ▼ (via Cloudflare Tunnel / Direct Localhost)
    ( FastAPI Python Backend )
              │
              ├──> [Supabase Cloud PostgreSQL + pgvector] (Holdings, Users, Conversations)
              │
              ├──> [Google Gemini API / Cloud LLM] (High-Speed Generation: gemini-3.1-flash-lite)
              │
              └──> [Local Ollama Instance] (nomic-embed-text for 768-dim embeddings & Offline Chat Fallback)
```

### Architecture Specifications:

| Component | Implementation | Notes |
|---|---|---|
| **Frontend** | React (Vite) + Tailwind CSS | Poppins typography, Headless UI, responsive off-canvas mobile drawer, zero-blur standard |
| **Backend** | FastAPI + SQLAlchemy 2.0 | 4-tier pattern (Routes → Services → Repositories → Models). Scoped dependency transactions (`get_db`) |
| **Cloud Database** | Supabase PostgreSQL + `pgvector` | AWS Singapore instance. Configured with `connect_args={"prepare_threshold": None}` for transaction-mode PgBouncer compatibility |
| **Embeddings** | Ollama (`nomic-embed-text`) | 768-dimensional document and query embeddings. Stored with HNSW index (`cosine_distance`) |
| **Generative LLM** | Google Gemini API + Local Fallback | Primary: `gemini-3.1-flash-lite` (sub-2s responses). Fallback: local Ollama (`qwen2.5:3b` / `llama3.2:3b`) with `num_predict: 250` token limits |
| **Remote Bridge** | Cloudflare Tunnel (`cloudflared`) | Standalone tunnel binary; eliminates telco DNS blocking (Globe/Smart) and warning pages associated with free ngrok |

---

## Key Milestone Updates

### 1. Database Migration: Local Docker → Supabase Cloud
- Deployed database to Supabase Cloud, removing the requirement to run Docker Desktop locally.
- Added `backend/app/commands/seed_books.py` to parse `BSCS_Holdings_Cleaned.csv` directly into Supabase (seeding **29 courses**, **178 unique books**, and **194 course links**), overcoming cloud `COPY from file` permission barriers.
- Resolved transaction pooler prepared statement errors (`_pg3_0 does not exist`) by disabling client preparation in SQLAlchemy (`prepare_threshold: None`).
- Synced `database/schema.sql` with backend models, including the `needs_reindex` tracking column.

### 2. Dual-Engine LLM & Latency Optimization
- Integrated Google GenAI SDK (`google-genai`) with automatic fallback to Ollama when offline or rate-limited.
- Identified that older model strings (`gemini-1.5-flash`) were retired and preview models (`gemini-3.8-flash`) suffered from heavy server queue congestion (503 retries lasting >160s).
- Standardized on **`gemini-3.1-flash-lite`** for high quota availability, sub-2-second generation, and clean prompt compliance.
- Optimized local Ollama parameters (`num_predict: 250`, `num_ctx: 1536`) to prevent rambling and eliminate mobile browser connection timeouts.
- Built a standalone benchmarking tool [`backend/app/commands/benchmark_chat.py`](backend/app/commands/benchmark_chat.py) to measure retrieval and generation timings without cluttering production routes.

### 3. Prompt Engineering & Multilingual Mirroring
- Updated [`prompts.py`](backend/app/services/prompts.py) with explicit IF/THEN rules for automatic language matching:
  - English prompts receive English answers.
  - Tagalog/Taglish prompts receive natural conversational Taglish.
  - Bisaya/Cebuano prompts receive natural Bisaya.
- Guardrails protect technical terminology (e.g., *loops, database, array, inheritance*) and catalog metadata (titles, authors, call numbers) from literal or awkward translation.
- Structured book recommendation output with horizontal divider lines (`---`), distinct bold numbered titles, and indented metadata cards.

### 4. Verification Command Refinement
- Updated `/verify <title>` in [`chat.py`](backend/app/services/chat.py) and the frontend prompt tip in [`Chat.jsx`](frontend/libraria-app/src/components/chat/Chat.jsx) to reference the **"CCS library collection"** instead of technical database jargon.
- Streamlined `search_by_title` in the repository layer to prevent redundant relation joins during verification checks.

### 5. Infrastructure: ngrok → Cloudflare Tunnel
- Replaced ngrok with standalone `cloudflared` to eliminate Philippine telco DNS blacklisting (Globe, Smart) and browser interstitial warnings.

---

## Role & Permission Matrix

| Role | Permissions | Navigation |
|---|---|---|
| **Guest** | Stateless chat, catalog search, course filtering | `/chat`, `/books`, `/categories` |
| **Student** (`user`) | Full authenticated chat, persistent history, pinning, inline thread rename, profile management | `/chat`, `/books`, `/categories`, Account Modal |
| **Librarian** | Everything above + book catalog management (CRUD), copy count tracking, availability toggle, CSV batch import, AI re-indexing | `/library` (Manage Books) |
| **Admin** | Everything above + staff user provisioning, role adjustments, account activation/deactivation, password reset dispatch | `/admin` (Manage Users) |

---

## Sprint Backlog & Current Priorities

### In Progress / High Priority:
- [ ] **Cloudflare Tunnel Automation:** Package a one-click startup script (`start_tunnel.ps1`) for launching backend and Cloudflare simultaneously.
- [ ] **Librarian Demand Dashboard:** Surface unfulfilled queries and zero-match searches from the `messages` table so library staff identify curriculum gaps in holdings.
- [ ] **Role-Based Post-Login Routing:** Route librarians to `/library` and admins to `/admin` immediately upon successful authentication.

### Medium Priority:
- [ ] **Enriched Book Metadata for RAG:** Incorporate book `description` fields into `book_to_text()` embeddings to improve recall for abstract semantic queries.
- [ ] **Copy-Aware Responses:** Inform students within the AI response if all physical copies of a requested title are currently marked unavailable.
- [ ] **Automated Test Suite:** Implement `pytest` test suites covering authentication, book repository operations, and RAG retrieval pipelines.

---

## Command Reference

### Database & Embeddings
```powershell
# Seed catalog into Supabase PostgreSQL
python -m app.commands.seed_books

# Compute vector embeddings for library holdings
python -m app.commands.embed_books

# Create initial administrator profile
python -m app.commands.create_admin
```

### Performance & Evaluation
```powershell
# Measure real-time latency breakdown across all RAG pipeline stages
python -m app.commands.benchmark_chat

# Run retrieval accuracy metrics against golden test dataset
python -m app.commands.evaluate_retrieval

# Run RAGAS faithfulness and context recall benchmarks
python -m app.commands.evaluate_ragas
```
