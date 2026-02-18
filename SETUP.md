# Local Development Setup

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS or later | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Bundled with Node |
| Groq API key | — | Free at [console.groq.com](https://console.groq.com) — no credit card required |

---

## 1. Clone and install

```bash
git clone <your-repo-url>
cd verities
npm install
```

This installs dependencies for all three packages (`frontend`, `backend`, `shared`) via npm workspaces.

---

## 2. Configure the backend

```bash
cp packages/backend/.env.example packages/backend/.env
```

Open `packages/backend/.env` and fill in at minimum:

```env
GROQ_API_KEY=gsk_...        # required — get from console.groq.com
DATABASE_URL=file:./dev.db  # SQLite — fine for local dev
PORT=3001
FRONTEND_URL=http://localhost:5173
CONTENT_FILTER_ENABLED=true
```

Everything else is optional for local development.

---

## 3. Set up the database (SQLite for dev)

The project ships a dedicated SQLite schema for local development:

```bash
npm run prisma:generate:dev -w packages/backend
npm run prisma:push:dev     -w packages/backend
```

This creates `packages/backend/prisma/dev.db` and generates the Prisma client targeting SQLite.

> **Tip:** Run `npm run prisma:studio:dev -w packages/backend` to open Prisma Studio and browse the database in your browser.

---

## 4. Build the shared package

```bash
npm run build:shared
```

The `frontend` and `backend` both import types/schemas from `@verities/shared`, so this must be built first.

---

## 5. Start the dev servers

Open two terminal tabs:

**Terminal 1 — backend (port 3001):**
```bash
npm run dev:backend
```

**Terminal 2 — frontend (port 5173):**
```bash
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Project structure

```
verities/
├── packages/
│   ├── frontend/          React 19 + Vite 7 + Tailwind CSS 4
│   │   ├── src/
│   │   │   ├── pages/     Route-level components
│   │   │   ├── components/
│   │   │   └── lib/       API client, document parser
│   │   └── vite.config.ts
│   ├── backend/           Fastify 5 + Prisma 6 + Groq LLM
│   │   ├── src/
│   │   │   ├── routes/    HTTP endpoints
│   │   │   ├── services/  LLM, cache, fact-check logic
│   │   │   └── config/    Env validation, Prisma client
│   │   └── prisma/
│   │       ├── schema.prisma         PostgreSQL (production)
│   │       └── schema.dev.prisma     SQLite (local dev)
│   └── shared/            Zod schemas + TypeScript types
└── package.json           Workspace root
```

---

## Optional: Google OAuth

To enable the Sign in with Google button, add to your `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client IDs.

---

## Optional: Redis cache

The backend defaults to in-memory LRU caching. For persistent caching across restarts, start Redis locally and set:

```env
REDIS_URL=redis://localhost:6379
```

---

## Common issues

| Issue | Fix |
|-------|-----|
| `Cannot find module '@verities/shared'` | Run `npm run build:shared` first |
| `PrismaClientInitializationError` | Run `npm run prisma:push:dev -w packages/backend` |
| Port 3001 already in use | Change `PORT=` in `.env` and update `VITE_API_URL` if set |
| Groq rate limit errors | You're on the free tier — slow down requests or upgrade |
