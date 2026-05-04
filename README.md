# Personal OS

A **local-first, AI-powered personal productivity app** that runs entirely on your own machine.  
Track habits, write a daily journal, manage finances, monitor subscriptions, and chat with an AI that has full context of your data — with zero cloud dependency.

![stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20SQLite-blue)
![ai](https://img.shields.io/badge/AI-LM%20Studio%20%2F%20Ollama-purple)
![license](https://img.shields.io/badge/license-MIT-green)

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Read-only overview of today's habits, journal, subscriptions + AI morning briefing |
| **Journal** | Daily entries with rich-text editor, mood tracking, tags, and AI summaries |
| **Habits** | Daily / weekly habit tracking with streaks and completion stats |
| **Finance** | Income & expense tracking, category budgets, AI credit-card optimisation tips |
| **Subscriptions** | Track recurring payments with renewal alerts and AI spending insights |
| **AI Chat** | Conversational assistant with full read access to all your personal data |

---

## Architecture

```
┌─────────────────────────────────┐
│  Browser  :5173  (Vite / React) │
│  Tailwind · React Query · Tiptap│
└────────────┬────────────────────┘
             │  /api/* proxy
┌────────────▼────────────────────┐
│  FastAPI backend  :8000         │
│  SQLAlchemy · Pydantic v2       │
│  SQLite  (data/personal-os.db)  │
└────────────┬────────────────────┘
             │  OpenAI-compatible API
┌────────────▼────────────────────┐
│  LM Studio / Ollama  :1234      │
│  Chat model + Embedding model   │
└─────────────────────────────────┘
```

Everything runs **locally**. No data ever leaves your machine.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| **Python** | 3.11 | 3.12 recommended |
| **Node.js** | 18 | 20 LTS recommended |
| **npm** | 9 | comes with Node |
| **Git** | any | |
| **LM Studio** | 0.3+ | _or_ any OpenAI-compatible server (Ollama, llama.cpp…) |

> **Windows users** — SQLCipher (optional DB encryption) is not supported on Windows. The app runs fine without it; keep `DB_ENCRYPTION=false`.

---

## Installation

### 1 — Clone the repository

```bash
git clone https://github.com/Jeevanrajss/Personal-OS.git
cd Personal-OS
```

---

### 2 — Backend setup

```bash
cd backend

# Create a Python virtual environment
python3 -m venv .venv

# Activate it
# macOS / Linux:
source .venv/bin/activate
# Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# Install all dependencies
pip install -e .
```

---

### 3 — Create your `.env` file

Create a file called **`.env`** in the **project root** (the `Personal-OS/` folder, not inside `backend/`):

```bash
# from the repo root
cp .env.example .env        # if the example file exists
# — OR — create it manually:
touch .env
```

Paste and edit the following:

```dotenv
# ── App ──────────────────────────────────────────────────────────────────────
APP_ENV=dev
TIMEZONE=Asia/Kolkata          # e.g. America/New_York, Europe/London
CURRENCY=INR                   # e.g. USD, EUR, GBP

# ── Database ─────────────────────────────────────────────────────────────────
# Leave DB_ENCRYPTION=false unless you install SQLCipher (see optional section)
DB_ENCRYPTION=false
DB_PASSPHRASE=change-me-before-enabling-encryption

# ── LLM / AI (LM Studio defaults) ────────────────────────────────────────────
LLM_HOST=http://127.0.0.1:1234
LLM_CHAT_MODEL=google/gemma-4-e4b
LLM_FAST_MODEL=google/gemma-4-e4b
LLM_EMBED_MODEL=nomic-ai/nomic-embed-text-v1.5-gguf
```

> The database file is created automatically at `data/personal-os.db` on first run.

---

### 4 — Frontend setup

```bash
# from the repo root
cd frontend
npm install
```

---

### 5 — Set up LM Studio (AI engine)

The app uses a **local AI model** for journal summaries, habit insights, finance tips, and the AI chat.  
All AI features degrade gracefully — the app still works without them.

**Option A — LM Studio (recommended, beginner-friendly)**

1. Download and install [LM Studio](https://lmstudio.ai) for your OS.
2. Inside LM Studio, search and download two models:
   - **Chat model** → `google/gemma-4-e4b` *(or any instruction-tuned model, e.g. `llama-3.2-3b-instruct`, `mistral-7b-instruct`)*
   - **Embedding model** → `nomic-ai/nomic-embed-text-v1.5-gguf`
3. Click **Local Server** tab → **Start Server** (port `1234` by default).
4. Load both models from the server tab.

**Option B — Ollama**

```bash
# install Ollama: https://ollama.com
ollama pull llama3.2        # or any model you prefer
ollama pull nomic-embed-text
```

Then update `.env`:
```dotenv
LLM_HOST=http://127.0.0.1:11434
LLM_CHAT_MODEL=llama3.2
LLM_FAST_MODEL=llama3.2
LLM_EMBED_MODEL=nomic-embed-text
```

> **No GPU?** Small models (1 B–7 B) run fine on CPU, just slower. AI features are optional.

---

## Running the App

You need **two terminals** running at the same time.

**Terminal 1 — Backend API server:**
```bash
cd Personal-OS/backend
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

You should see:
```
INFO:     Booting Personal OS backend
INFO:     DB ready
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Terminal 2 — Frontend dev server:**
```bash
cd Personal-OS/frontend
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser. ✅

---

## Updating

```bash
# Pull latest code
git pull origin main

# Update backend dependencies
cd backend
source .venv/bin/activate
pip install -e .

# Update frontend dependencies
cd ../frontend
npm install
```

> **No manual migrations needed.** The backend applies any schema changes automatically on startup.

---

## Optional: Database Encryption

Encrypts the SQLite database with [SQLCipher](https://www.zetetic.net/sqlcipher/).

**macOS:**
```bash
brew install sqlcipher
pip install sqlcipher3
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install libsqlcipher-dev
pip install sqlcipher3
```

Then in `.env`:
```dotenv
DB_ENCRYPTION=true
DB_PASSPHRASE=your-strong-passphrase
```

> ⚠️ Enable encryption **before** creating any data (fresh install), or delete `data/personal-os.db` first.  
> ⚠️ Windows is **not** supported for encryption — keep `DB_ENCRYPTION=false`.

---

## Configuration Reference

All settings go in `Personal-OS/.env` (project root).

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `dev` | `dev` or `prod` |
| `TIMEZONE` | `Asia/Kolkata` | Your timezone (IANA format) |
| `CURRENCY` | `INR` | Default currency shown in Finance |
| `DB_PATH` | `data/personal-os.db` | SQLite file path (relative to project root) |
| `DB_ENCRYPTION` | `false` | Enable SQLCipher encryption |
| `DB_PASSPHRASE` | `change-me-in-dotenv` | DB passphrase (only when encryption is on) |
| `LLM_HOST` | `http://127.0.0.1:1234` | LLM server base URL |
| `LLM_CHAT_MODEL` | `google/gemma-4-e4b` | Chat / reasoning model ID |
| `LLM_FAST_MODEL` | `google/gemma-4-e4b` | Faster model for tag suggestions etc. |
| `LLM_EMBED_MODEL` | `nomic-ai/nomic-embed-text-v1.5-gguf` | Embedding model for journal search |
| `OFFLINE_MODE` | `false` | Set `true` to disable all outbound LLM calls |

---

## Supported AI Servers

The backend uses any **OpenAI-compatible** API.

| Server | `LLM_HOST` |
|---|---|
| **LM Studio** *(default)* | `http://127.0.0.1:1234` |
| **Ollama** | `http://127.0.0.1:11434` |
| **llama.cpp server** | `http://127.0.0.1:8080` |
| **OpenAI** | `https://api.openai.com` |
| **Groq / Together / Mistral** | their OpenAI-compat endpoint |

---

## API Documentation

When the backend is running:

- **Swagger UI** → [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc** → [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health check** → [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## Project Structure

```
Personal-OS/
├── .env                        ← your local config (not committed to git)
├── data/
│   └── personal-os.db          ← SQLite database (auto-created on first run)
│
├── backend/
│   ├── pyproject.toml          ← Python dependencies
│   └── app/
│       ├── main.py             ← FastAPI app factory + router registration
│       ├── config.py           ← Settings loaded from .env
│       ├── db.py               ← SQLAlchemy engine, sessions, auto-migrations
│       ├── models/             ← ORM table definitions
│       │   ├── account.py
│       │   ├── budget.py
│       │   ├── finance.py
│       │   ├── habit.py
│       │   ├── journal.py
│       │   └── subscription.py
│       ├── schemas/            ← Pydantic request / response types
│       ├── routers/            ← API endpoints
│       │   ├── accounts.py     ← /accounts  (bank accounts + card tips)
│       │   ├── ai.py           ← /ai        (chat, insights, briefing)
│       │   ├── finance.py      ← /finance   (transactions, budgets, summary)
│       │   ├── habit.py        ← /habits
│       │   ├── journal.py      ← /journal
│       │   └── subscription.py ← /subscriptions
│       └── services/
│           └── llm_client.py   ← LLM abstraction (generate, chat, embed)
│
└── frontend/
    ├── package.json
    ├── vite.config.ts          ← dev server + /api proxy to :8000
    └── src/
        ├── routes/             ← Page components (Dashboard, Finance, …)
        ├── components/         ← Reusable UI components
        └── lib/
            ├── api.ts          ← All API calls + TypeScript types
            └── cn.ts           ← Tailwind class helper
```

---

## Troubleshooting

**Backend won't start — `ModuleNotFoundError`**  
You forgot to activate the virtual environment or run `pip install -e .`.
```bash
cd backend && source .venv/bin/activate && pip install -e .
```

**AI features return empty or error**  
1. Make sure LM Studio is running with the server started (green indicator).  
2. Check that model IDs in `.env` exactly match what LM Studio shows.  
3. Hit [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) — the `llm` block shows the connection status.

**`sqlcipher3 not installed` warning on startup**  
Just a warning — the app falls back to plain SQLite automatically. Safe to ignore unless you want encryption.

**Port already in use**  
Change the backend port: `uvicorn app.main:app --port 8001`  
Then update the proxy target in `frontend/vite.config.ts` to match.

**Frontend shows a blank page**  
Make sure the backend is running on port 8000 — Vite proxies all `/api/*` requests to it.

**Reset the database**  
Delete `data/personal-os.db` and restart the backend. A fresh schema is created automatically.

---

## Tech Stack

**Backend** — Python 3.11+
- [FastAPI](https://fastapi.tiangolo.com/) — async REST framework
- [SQLAlchemy 2.0](https://www.sqlalchemy.org/) — ORM
- [Pydantic v2](https://docs.pydantic.dev/) — validation & serialisation
- [SQLite](https://www.sqlite.org/) + optional [SQLCipher](https://www.zetetic.net/sqlcipher/)
- [sqlite-vec](https://github.com/asg017/sqlite-vec) — vector search for journal

**Frontend** — TypeScript
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query) — server-state management
- [Tiptap](https://tiptap.dev/) — rich-text editor
- [React Router v6](https://reactrouter.com/)
- [Lucide React](https://lucide.dev/) — icons

**AI**
- [LM Studio](https://lmstudio.ai/) (default local server)
- Any [OpenAI-compatible](https://platform.openai.com/docs/api-reference) endpoint

---

## License

MIT — free to use, modify, and distribute.

---

*Built by [Jeevan Raj](https://github.com/Jeevanrajss)*
