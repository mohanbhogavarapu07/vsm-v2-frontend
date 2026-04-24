# Virtual Scrum Master (VSM) v2 🚀

Welcome to **VSM v2**, an AI-Driven Scrum Automation System. This project bridges the gap between your IDE and your Project Board. It uses a specialized AI Agent to "observe" development signals (commits, PRs, comments) and acts as a Virtual Scrum Master to manage the task lifecycle autonomously.

> **⚠️ IMPORTANT NOTE:** You are currently viewing the **Frontend** repository. The VSM system is a distributed application that requires three separate components to run locally. Because this repo serves as the public face of the project, this README provides the comprehensive setup guide for the **entire system**.

---

## 🌟 Features

* **Autonomous Task Management:** AI automatically moves tickets based on GitHub webhooks (Commits, PRs).
* **Live Kanban Board:** Real-time updates via SSE showing AI-driven transitions.
* **Auditability:** Every AI decision provides a reasoning trace and confidence score, ensuring no "black box" decisions.
* **Fuzzy Linking:** AI links unreferenced commits to tasks based on content analysis.
* **Project-Scoped Workflows:** Custom graphs of stages (e.g., Backlog -> Todo -> Active -> Validation -> Done).

---

## 🏗️ System Architecture

To run VSM v2, you need all three core services running simultaneously:

1. **Frontend (This Repo):** React (Vite) application acting as the command center and UI.
2. **Backend (Orchestrator):** FastAPI service handling webhooks, database persistence (PostgreSQL/Prisma), and task aggregation (Celery + Redis).
3. **AI Agent (The Brain):** LangGraph worker that analyzes events and makes complex routing decisions using LLMs.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your system:
* **Node.js** (v18+)
* **Python** (v3.11+)
* **PostgreSQL** (Running instance)
* **Redis** (Running instance for Celery task queues)
* **Git**

---

## 🚀 Complete System Setup Guide

To get the full VSM system running, you must clone all related repositories. We recommend placing them in the same parent directory for easier management.

```bash
mkdir vsm-workspace
cd vsm-workspace

# 1. Clone the repositories
git clone <URL_TO_THIS_FRONTEND_REPO> vsm-v2-frontend
git clone <URL_TO_BACKEND_REPO> vsm-v2-backend
git clone <URL_TO_AGENT_REPO> vsm-ai-agent
```
*(Note: Replace `<URL_TO...>` with the actual GitHub repository URLs provided by the project maintainers.)*

### Step 1: Database & Redis Setup
Ensure your local PostgreSQL and Redis servers are running. Create a new PostgreSQL database for the project (e.g., `vsm_db`).

### Step 2: Backend Setup (`vsm-v2-backend`)
The backend is responsible for API routing, the database, and asynchronous event processing.

```bash
cd vsm-v2-backend

# Create and activate a virtual environment
python -m venv venv
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, etc.

# Setup Database using Prisma
prisma generate
prisma db push

# Run the Backend API server
uvicorn app.main:app --reload --port 8000

# In a separate terminal window (ensure venv is activated), run the Celery Worker:
celery -A app.worker.celery worker --loglevel=info
```

### Step 3: AI Agent Setup (`vsm-ai-agent`)
The AI agent uses LangGraph to process logic.

```bash
cd ../vsm-ai-agent

# Create and activate a virtual environment
python -m venv venv
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Edit .env and add your LLM API Keys (e.g., GROQ_API_KEY, OPENAI_API_KEY)

# Run the Agent service
python main.py # (or the designated start script for the agent)
```

### Step 4: Frontend Setup (`vsm-v2-frontend`)
Finally, set up and run the frontend to interact with the system.

```bash
cd ../vsm-v2-frontend

# Install dependencies (NPM is recommended, but Bun is also supported)
npm install

# Environment Setup
cp .env.example .env
# Ensure VITE_API_URL points to your backend (default is usually http://localhost:8000)

# Start the development server
npm run dev
```

---

## ⚙️ Environment Variables Summary

You will need to configure `.env` files in each repository. Here is a general breakdown of what they require:

**Backend (`vsm-v2-backend/.env`)**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vsm_db"
REDIS_URL="redis://localhost:6379/0"
GITHUB_WEBHOOK_SECRET="your_secret_here"
```

**AI Agent (`vsm-ai-agent/.env`)**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vsm_db"
GROQ_API_KEY="your_groq_api_key"
# Add other LLM keys as required depending on the configured provider
```

**Frontend (`vsm-v2-frontend/.env`)**
```env
VITE_API_URL="http://localhost:8000"
```

---

## 🏃‍♂️ Daily Workflow

To run the system daily for development, you will need the following processes running simultaneously in separate terminal tabs:

1. **Infrastructure:** PostgreSQL & Redis (usually running as background services).
2. **Backend API:** `uvicorn app.main:app --reload` (in `vsm-v2-backend`).
3. **Task Queue:** `celery -A app.worker.celery worker` (in `vsm-v2-backend`).
4. **AI Engine:** The agent runner script (in `vsm-ai-agent`).
5. **Web UI:** `npm run dev` (in `vsm-v2-frontend`).

---

## 🤝 Contributing
For contributing guidelines, please refer to the specific repositories. We welcome pull requests across the stack to improve the AI reasoning, backend stability, or frontend user experience!
