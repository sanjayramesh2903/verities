# Verities v1.0 Release Design

**Date:** 2026-02-18
**Status:** Approved

---

## Overview

Six deliverables for the v1.0 release:
1. API & database bug fixes
2. RiskGraph visualization for ReviewDocument
3. File upload (PDF, DOCX, DOC, TXT, MD) with client-side extraction
4. UI polish — fun, animated, engaging
5. Local hosting instructions (`SETUP.md`)
6. Railway deployment instructions (`DEPLOY.md`)

---

## 1. API & Database Fixes

### Fix 1 — SQLite/PostgreSQL schema mismatch
- Add `packages/backend/prisma/schema.dev.prisma` with `provider = "sqlite"`
- Update `packages/backend/package.json` dev scripts to pass `--schema prisma/schema.dev.prisma`
- Production uses existing `prisma/schema.prisma` (PostgreSQL)
- Run `prisma migrate dev --name init` against SQLite dev schema

### Fix 2 — Ephemeral JWT_SECRET
- Keep auto-generate fallback for `NODE_ENV=development` only
- Log a `console.warn` in non-dev if `JWT_SECRET` is not set in env

### Fix 3 — CORS scoped to FRONTEND_URL
- Change `origin: true` → `origin: env.FRONTEND_URL` in `server.ts`
- Already in env config, just not wired up

---

## 2. RiskGraph Component

**File:** `packages/frontend/src/components/RiskGraph.tsx`

Adapts `ConceptGraph.tsx` D3 force-directed pattern for risk-scored claims.

### Node design
- Type: `HighRiskClaim` nodes + extracted concept nodes
- Size: claim nodes r=14, concept nodes r=9 (same as ConceptGraph)
- Color by risk score:
  - `#f87171` — red (score > 0.7, "likely_overstated")
  - `#fb923c` — amber (score 0.4–0.7, "needs_review")
  - `#4ade80` — green (score < 0.4, "likely_ok")
  - `#60a5fa` — cerulean (concept nodes)
- Glow filter, drag, zoom/pan — same as ConceptGraph
- Label inside node: `R1`, `R2`, etc.
- Full claim text shown on hover tooltip

### Edge design
- Claims sharing topic keywords connected by edges
- Edge color: `rgba(148,163,184,0.3)`, highlights on hover

### Placement
- Below 3-stat summary cards, above RiskClaimRow list
- Section heading: "Claim Risk Map"
- Dark Obsidian aesthetic (slate-950 bg, dot grid, glow)

### Legend
- High Risk (red) · Needs Review (amber) · OK (green) · Concept (blue)
- "Drag to rearrange · Scroll to zoom" hint

---

## 3. File Upload

**New file:** `packages/frontend/src/lib/parseDocument.ts`

```
extractTextFromFile(file: File): Promise<string>
```

| Extension | Method |
|-----------|--------|
| `.pdf` | `pdfjs-dist` — extract all pages, join |
| `.docx`, `.doc` | `mammoth.extractRawText({ arrayBuffer })` |
| `.txt`, `.md`, `.rtf` | `FileReader.readAsText()` |

**UI in ReviewDocument.tsx:**
- Drag-and-drop zone above textarea (dashed border, icon, label)
- Supported formats badge row: `PDF · DOCX · DOC · TXT · MD`
- 5 MB client-side size limit
- After parse: populate textarea, show filename + word count pill
- "or paste text below" divider between upload zone and textarea
- Error state if file type unsupported or parse fails

---

## 4. UI Polish — Fun, Animated, Engaging

### Animations
- Staggered card entrance animations (CSS `animation-delay` per index)
- Number counter animation on stats cards (count up from 0 on reveal)
- Pulse ring on Submit buttons while loading
- Smooth page transitions via `transition` classes
- RiskGraph nodes fade in sequentially after simulation settles
- Confetti-style burst (CSS only, no library) on "Looking good!" zero-risk result

### Visual upgrades
- Landing page: animated gradient hero background (cerulean → terracotta → sage slow cycle)
- Better empty states with illustrated SVG icons (inline, no external deps)
- RiskClaimRow: colored left border strip by risk level
- Improved shimmer skeletons that match result card shapes
- Navbar: subtle glass blur backdrop on scroll (`backdrop-blur`, `bg-white/80`)
- Footer added with copyright + links

### Performance
- `React.memo` on `RiskClaimRow` and `ClaimCard`
- `React.lazy` + `Suspense` on `HistoryDetail`, `Profile`, `About`, `History`
- `useCallback` on submit handlers
- `vite-plugin-compression` (gzip + brotli) in `vite.config.ts`
- Open Graph + `<meta>` tags in `index.html`

---

## 5. Local Hosting Instructions

**File:** `SETUP.md` at repo root

Steps:
1. Prerequisites: Node.js 20+, a free Groq API key
2. `npm install` from root
3. Copy `.env.example` → `.env`, fill `GROQ_API_KEY`
4. `npx prisma migrate dev --name init` (SQLite, no Postgres needed)
5. `npm run dev`
6. Open `http://localhost:5173`

---

## 6. Railway Deployment Instructions

**File:** `DEPLOY.md` at repo root

Steps:
1. Create Railway project, add PostgreSQL plugin (auto-sets `DATABASE_URL`)
2. Set env vars: `GROQ_API_KEY`, `JWT_SECRET` (generate with `openssl rand -hex 32`), `FRONTEND_URL`
3. Backend service: build command `npm run build`, start command `npm start`, release command `npx prisma migrate deploy`
4. Frontend: separate Railway static service or Vercel, set `VITE_API_URL` to backend Railway URL
5. Verify `/health` endpoint returns `{ status: "ok", database: "connected" }`
