# Verities v1.0 Release — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Verities v1.0 with DB/API bug fixes, RiskGraph visualization, file upload (PDF/DOCX/TXT), engaging animated UI, and deployment docs.

**Architecture:** Monorepo (packages/frontend · packages/backend · packages/shared). Frontend is React 19 + Vite + Tailwind 4 + D3. Backend is Fastify 5 + Prisma 6. Client-side document parsing using already-installed mammoth + pdfjs-dist. No new backend endpoints needed.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, D3 v7, Fastify 5, Prisma 6, mammoth 1.11, pdfjs-dist 5.4, TypeScript 5.9

---

## Task 1: Fix CORS Origin (Backend)

**Files:**
- Modify: `packages/backend/src/server.ts:41`

**Step 1: Change `origin: true` to use FRONTEND_URL**

In `packages/backend/src/server.ts`, find the `cors` registration block (line ~41):
```ts
await server.register(cors, { origin: true, credentials: true });
```
Replace with:
```ts
await server.register(cors, {
  origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : true,
  credentials: true,
});
```

**Step 2: Verify it compiles**

```bash
cd packages/backend && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/backend/src/server.ts
git commit -m "fix: scope CORS origin to FRONTEND_URL in production"
```

---

## Task 2: Fix Ephemeral JWT_SECRET Warning (Backend)

**Files:**
- Modify: `packages/backend/src/config/env.ts:21`

**Step 1: Add production warning when JWT_SECRET not set**

In `packages/backend/src/config/env.ts`, find the `loadEnv` function body and add a warning after the result check:

```ts
function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  // Warn if JWT_SECRET is auto-generated in non-dev environments
  if (result.data.NODE_ENV !== "development" && !process.env.JWT_SECRET) {
    console.warn(
      "[SECURITY] JWT_SECRET not set — using auto-generated secret. " +
      "All sessions will be invalidated on restart. Set JWT_SECRET in your environment."
    );
  }
  return result.data;
}
```

**Step 2: Verify it compiles**

```bash
cd packages/backend && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/backend/src/config/env.ts
git commit -m "fix: warn when JWT_SECRET is ephemeral in non-dev environments"
```

---

## Task 3: Create SQLite Dev Schema (Backend)

**Context:** `packages/backend/prisma/schema.prisma` declares `provider = "postgresql"` but the default `DATABASE_URL` in `.env.example` is `file:./dev.db` (SQLite). Prisma will fail locally unless we add a SQLite dev schema.

**Files:**
- Create: `packages/backend/prisma/schema.dev.prisma`
- Modify: `packages/backend/package.json`

**Step 1: Create the SQLite dev schema**

Create `packages/backend/prisma/schema.dev.prisma` — copy everything from `schema.prisma` but change the datasource block only:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  googleId     String?  @unique
  email        String   @unique
  passwordHash String?
  authProvider String   @default("google")
  displayName  String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  checks      Check[]
  preferences UserPreferences?
  auditLogs   AuditLog[]
  topics      Topic[]
  topicEdges  TopicEdge[]
}

model Check {
  id           String   @id @default(uuid())
  userId       String
  type         String
  inputSnippet String
  resultJson   String
  claimCount   Int
  createdAt    DateTime @default(now())
  expiresAt    DateTime

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  topicClaims TopicClaim[]

  @@index([userId, createdAt])
  @@index([expiresAt])
}

model UserPreferences {
  id            String   @id @default(uuid())
  userId        String   @unique
  citationStyle String   @default("mla")
  maxClaims     Int      @default(10)
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  metadata  String?
  ip        String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
}

model Topic {
  id         String     @id @default(uuid())
  userId     String
  label      String
  claimCount Int        @default(1)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  claims TopicClaim[]

  @@unique([userId, label])
  @@index([userId])
}

model TopicClaim {
  id        String @id @default(uuid())
  topicId   String
  checkId   String
  claimText String

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)
  check Check @relation(fields: [checkId], references: [id], onDelete: Cascade)

  @@index([topicId])
  @@index([checkId])
}

model TopicEdge {
  id       String @id @default(uuid())
  userId   String
  sourceId String
  targetId String
  weight   Int    @default(1)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, sourceId, targetId])
  @@index([userId])
}
```

**Step 2: Add dev-specific Prisma scripts to backend package.json**

In `packages/backend/package.json`, update the `scripts` block:
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc --build",
  "start": "node dist/server.js",
  "prisma:generate": "prisma generate",
  "prisma:generate:dev": "prisma generate --schema prisma/schema.dev.prisma",
  "prisma:push": "prisma db push",
  "prisma:push:dev": "prisma db push --schema prisma/schema.dev.prisma",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:dev": "prisma migrate dev --schema prisma/schema.dev.prisma",
  "prisma:studio:dev": "prisma studio --schema prisma/schema.dev.prisma"
}
```

**Step 3: Verify the dev schema parses without errors**

```bash
cd packages/backend && npx prisma validate --schema prisma/schema.dev.prisma
```
Expected: `The schema at prisma/schema.dev.prisma is valid`

**Step 4: Commit**

```bash
git add packages/backend/prisma/schema.dev.prisma packages/backend/package.json
git commit -m "fix: add SQLite dev schema and dev prisma scripts"
```

---

## Task 4: Add Vite Compression Plugin (Frontend)

**Files:**
- Modify: `packages/frontend/package.json`
- Modify: `packages/frontend/vite.config.ts`

**Step 1: Install vite-plugin-compression**

```bash
cd packages/frontend && npm install --save-dev vite-plugin-compression
```
Expected: package added to `devDependencies`.

**Step 2: Add compression to vite.config.ts**

In `packages/frontend/vite.config.ts`, add the import and plugin:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import compression from "vite-plugin-compression";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    compression({ algorithm: "gzip" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
  ],
  resolve: {
    alias: {
      "@verities/shared": new URL("../shared/src/index.ts", import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "icons": ["lucide-react"],
          "d3": ["d3"],
        },
      },
    },
    target: "es2020",
    assetsInlineLimit: 4096,
  },
});
```

Note: `d3` is now a separate chunk so it only loads on pages that use it.

**Step 3: Verify the build works**

```bash
cd packages/frontend && npm run build
```
Expected: build succeeds, `.gz` and `.br` files appear alongside JS/CSS bundles in `dist/assets/`.

**Step 4: Commit**

```bash
git add packages/frontend/package.json packages/frontend/vite.config.ts packages/frontend/package-lock.json
git commit -m "perf: add gzip+brotli compression and split d3 into its own chunk"
```

---

## Task 5: Add New CSS Keyframes & Utility Classes (Frontend)

**Files:**
- Modify: `packages/frontend/src/index.css`

**Step 1: Add new keyframes and utilities at the end of index.css**

Append this block to the end of `packages/frontend/src/index.css`:

```css
/* ── New v1.0 animations ── */

@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes count-up {
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes pop-in {
  0%   { opacity: 0; transform: scale(0.7); }
  70%  { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes confetti-fall {
  0%   { opacity: 1; transform: translateY(-20px) rotate(0deg); }
  100% { opacity: 0; transform: translateY(60px) rotate(360deg); }
}

@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  70%  { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(-6deg); }
  75%       { transform: rotate(6deg); }
}

@keyframes fade-up-stagger {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-gradient {
  background-size: 300% 300%;
  animation: gradient-shift 8s ease infinite;
}

.animate-count-up { animation: count-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.animate-pop-in   { animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.animate-pulse-ring { animation: pulse-ring 1.5s ease-out infinite; }
.animate-wiggle   { animation: wiggle 0.5s ease-in-out; }
.animate-fade-up  { animation: fade-up-stagger 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

/* ── Confetti dots (CSS-only, used for "Looking good!" state) ── */
.confetti-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: confetti-fall 1.2s ease-out forwards;
}

/* ── Risk border strips on cards ── */
.risk-card-high   { border-left: 3px solid var(--color-terracotta); }
.risk-card-medium { border-left: 3px solid var(--color-amber); }
.risk-card-low    { border-left: 3px solid var(--color-sage); }

/* ── Glassmorphism navbar ── */
.navbar-glass {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(250, 250, 247, 0.85);
  border-bottom: 1px solid rgba(235, 232, 225, 0.8);
}

/* ── Drag-and-drop zone ── */
.drop-zone {
  border: 2px dashed var(--color-stone);
  border-radius: 12px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--color-cerulean);
  background: var(--color-cerulean-wash);
}

/* ── Stagger delays extended ── */
.delay-700  { animation-delay: 700ms; }
.delay-800  { animation-delay: 800ms; }
.delay-900  { animation-delay: 900ms; }
.delay-1000 { animation-delay: 1000ms; }
```

**Step 2: Verify CSS compiles (dev server loads)**

```bash
cd packages/frontend && npm run dev
```
Open `http://localhost:5173` — page should load without CSS errors in the console.

**Step 3: Commit**

```bash
git add packages/frontend/src/index.css
git commit -m "style: add v1.0 animation keyframes and utility classes"
```

---

## Task 6: Polish Navbar with Glass Effect on Scroll

**Files:**
- Modify: `packages/frontend/src/components/Navbar.tsx`

**Step 1: Read the current Navbar**

Read `packages/frontend/src/components/Navbar.tsx` fully before editing.

**Step 2: Add scroll-based glass effect**

Replace the entire file with a version that:
1. Tracks `scrolled` state via `useEffect` + `window.scroll` listener
2. Applies `navbar-glass` class when `scrolled` is true, plain `bg-ivory` when not
3. Adds `sticky top-0 z-50` positioning so it sticks to the top
4. Adds a subtle `transition-all duration-300` on the outer nav

Key structure:
```tsx
import { useState, useEffect } from "react";
// ... existing imports ...

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "navbar-glass shadow-sm" : "bg-ivory"
    }`}>
      {/* rest of current navbar content unchanged */}
    </nav>
  );
}
```

**Step 3: Verify visually**

```bash
cd packages/frontend && npm run dev
```
Scroll the Landing page — navbar should blur and tint on scroll.

**Step 4: Commit**

```bash
git add packages/frontend/src/components/Navbar.tsx
git commit -m "style: sticky glass-blur navbar on scroll"
```

---

## Task 7: Polish Landing Page Hero with Animated Gradient

**Files:**
- Modify: `packages/frontend/src/pages/Landing.tsx`

**Step 1: Replace the hero background with an animated gradient**

In `packages/frontend/src/pages/Landing.tsx`, replace the `<section className="relative overflow-hidden">` hero section with this version:

```tsx
{/* Hero */}
<section className="relative overflow-hidden">
  {/* Animated gradient background */}
  <div
    className="absolute inset-0 animate-gradient opacity-15"
    style={{
      background: "linear-gradient(135deg, #2563EB, #DC2626, #16A34A, #2563EB)",
    }}
  />
  <div className="absolute inset-0 dot-grid opacity-30" />

  <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 text-center">
    <div className="animate-rise">
      {/* Floating icon with wiggle on hover */}
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean shadow-xl shadow-cerulean/30 cursor-pointer hover:animate-wiggle transition-transform"
      >
        <Shield className="h-8 w-8 text-white" />
      </div>

      {/* Badge */}
      <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cerulean/20 bg-cerulean-wash px-4 py-1.5 animate-pop-in delay-75">
        <Sparkles className="h-3.5 w-3.5 text-cerulean" />
        <span className="text-xs font-semibold text-cerulean">AI-Powered Fact Checking</span>
      </div>

      <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
        Verify the facts<br />
        <span className="text-cerulean">in your writing</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
        Paste your text. Verities extracts each factual claim, checks it against
        ranked sources, and gives you verdicts, citations, and suggested rewrites.
      </p>
    </div>

    <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-rise delay-200">
      <Link
        to="/check"
        className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cerulean/30 transition-all hover:bg-cerulean-light hover:shadow-xl hover:shadow-cerulean/40 hover:-translate-y-0.5 animate-pulse-ring"
      >
        <Search className="h-4 w-4" />
        Check Facts
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        to="/review"
        className="inline-flex items-center gap-2 rounded-xl border border-vellum bg-white/80 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-cerulean/30 hover:shadow-md hover:-translate-y-0.5"
      >
        <FileText className="h-4 w-4" />
        Review Document
      </Link>
    </div>

    {/* Floating stat pills */}
    <div className="mt-12 flex flex-wrap justify-center gap-3 animate-fade-in delay-400">
      {[
        { label: "Claims checked", value: "100%" },
        { label: "Citation formats", value: "MLA · APA · Chicago" },
        { label: "Source tiers", value: "4 levels" },
      ].map((pill, i) => (
        <div
          key={i}
          className="rounded-full border border-vellum bg-white/70 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-ink-muted animate-fade-up"
          style={{ animationDelay: `${400 + i * 80}ms` }}
        >
          <span className="font-semibold text-ink">{pill.value}</span>
          {" · "}
          {pill.label}
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Verify it renders**

```bash
cd packages/frontend && npm run dev
```
Open `http://localhost:5173` — hero should have a slow shifting gradient, floating badge, and stat pills.

**Step 3: Commit**

```bash
git add packages/frontend/src/pages/Landing.tsx
git commit -m "style: animated gradient hero, badge, stat pills on Landing page"
```

---

## Task 8: Polish RiskClaimRow with Colored Border Strips

**Files:**
- Modify: `packages/frontend/src/components/RiskClaimRow.tsx`

**Step 1: Add colored left border strip**

In `packages/frontend/src/components/RiskClaimRow.tsx`, change the outer `<button>` className to include the risk border class:

```tsx
const riskBorderClass =
  claim.risk_score > 0.7
    ? "risk-card-high"
    : claim.risk_score > 0.4
      ? "risk-card-medium"
      : "risk-card-low";

return (
  <button
    onClick={onClick}
    className={`scholarly-card w-full animate-slide-up p-4 text-left transition-all hover:bg-parchment/50 hover:-translate-y-px hover:shadow-md ${riskBorderClass}`}
    style={{ animationDelay: `${index * 60}ms` }}
  >
```

Also update the risk bar to animate in (add `transition-all duration-700 delay-300` to the inner fill div):
```tsx
<div
  className={`h-full rounded-full ${riskColor} transition-all duration-700`}
  style={{ width: `${riskPercent}%`, transitionDelay: `${index * 60 + 300}ms` }}
/>
```

**Step 2: Verify**

```bash
cd packages/frontend && npm run dev
```
Navigate to `/review`, paste text, submit — check that cards have colored left borders and bars animate in.

**Step 3: Commit**

```bash
git add packages/frontend/src/components/RiskClaimRow.tsx
git commit -m "style: colored border strips and animated risk bars on RiskClaimRow"
```

---

## Task 9: Create Document Parser Utility (Frontend)

**Files:**
- Create: `packages/frontend/src/lib/parseDocument.ts`

**Step 1: Create the parseDocument utility**

Create `packages/frontend/src/lib/parseDocument.ts`:

```ts
/**
 * Client-side document text extraction.
 * Supports: PDF (pdfjs-dist), DOCX/DOC (mammoth), TXT/MD/RTF (FileReader)
 */

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentParseError";
  }
}

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

async function parsePdf(file: File): Promise<string> {
  // Dynamic import to keep initial bundle small
  const pdfjsLib = await import("pdfjs-dist");
  // Point to the PDF.js worker bundled with pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  // Dynamic import to keep initial bundle small
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new DocumentParseError("Failed to read text file"));
    reader.readAsText(file, "utf-8");
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentParseError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`
    );
  }

  const ext = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new DocumentParseError(
      `Unsupported file type "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }

  switch (ext) {
    case ".pdf":
      return parsePdf(file);
    case ".docx":
    case ".doc":
      return parseDocx(file);
    case ".txt":
    case ".md":
    case ".rtf":
      return parseText(file);
    default:
      throw new DocumentParseError(`Unsupported file type: ${ext}`);
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/frontend && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/frontend/src/lib/parseDocument.ts
git commit -m "feat: add client-side document parser (PDF, DOCX, TXT, MD)"
```

---

## Task 10: Create RiskGraph Component

**Files:**
- Create: `packages/frontend/src/components/RiskGraph.tsx`

**Step 1: Create RiskGraph.tsx**

Create `packages/frontend/src/components/RiskGraph.tsx` — this adapts the existing `ConceptGraph.tsx` pattern for risk-scored claims:

```tsx
import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { HighRiskClaim } from "@verities/shared";

interface RiskNode {
  id: string;
  label: string;
  type: "claim" | "concept";
  riskScore?: number;
  summaryVerdict?: string;
  claimIndex?: number;
}

interface RiskEdge {
  source: string;
  target: string;
  weight: number;
}

interface Props {
  claims: HighRiskClaim[];
}

// Risk score → node color
function riskColor(score: number): string {
  if (score > 0.7) return "#f87171";  // red — likely overstated
  if (score > 0.4) return "#fb923c";  // amber — needs review
  return "#4ade80";                   // green — likely ok
}

const CONCEPT_COLOR = "#60a5fa";
const BG_COLOR = "#0f172a";
const EDGE_COLOR = "rgba(148,163,184,0.25)";
const EDGE_HOVER_COLOR = "rgba(148,163,184,0.65)";

function buildRiskGraph(claims: HighRiskClaim[]): { nodes: RiskNode[]; edges: RiskEdge[] } {
  const nodes: RiskNode[] = [];
  const edges: RiskEdge[] = [];
  const conceptMap = new Map<string, string>(); // label → node id

  claims.forEach((claim, i) => {
    nodes.push({
      id: claim.claim_id,
      label: claim.original_text.length > 50
        ? claim.original_text.slice(0, 47) + "…"
        : claim.original_text,
      type: "claim",
      riskScore: claim.risk_score,
      summaryVerdict: claim.summary_verdict,
      claimIndex: i,
    });

    // Use first 3 words as concept label
    const words = claim.original_text.split(/\s+/).slice(0, 3).join(" ");
    const conceptLabel = words.charAt(0).toUpperCase() + words.slice(1);

    if (!conceptMap.has(conceptLabel)) {
      const conceptId = `concept-${conceptLabel}`;
      conceptMap.set(conceptLabel, conceptId);
      nodes.push({ id: conceptId, label: conceptLabel, type: "concept" });
    }

    edges.push({ source: claim.claim_id, target: conceptMap.get(conceptLabel)!, weight: 1 });
  });

  // Connect concepts sharing keywords
  const conceptEntries = Array.from(conceptMap.entries());
  for (let i = 0; i < conceptEntries.length; i++) {
    for (let j = i + 1; j < conceptEntries.length; j++) {
      const [labelA, idA] = conceptEntries[i];
      const [labelB, idB] = conceptEntries[j];
      const wordsA = new Set(labelA.toLowerCase().split(/\s+/));
      const wordsB = new Set(labelB.toLowerCase().split(/\s+/));
      const shared = [...wordsA].filter((w) => w.length > 3 && wordsB.has(w));
      if (shared.length > 0) {
        edges.push({ source: idA, target: idB, weight: shared.length });
      }
    }
  }

  return { nodes, edges };
}

export default function RiskGraph({ claims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useMemo(() => buildRiskGraph(claims), [claims]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 380;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    // Background
    svg.append("rect")
      .attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", BG_COLOR);

    // Dot grid
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "riskgrid").attr("width", 30).attr("height", 30)
      .attr("patternUnits", "userSpaceOnUse");
    pattern.append("circle").attr("cx", 15).attr("cy", 15).attr("r", 1)
      .attr("fill", "rgba(148,163,184,0.1)");
    svg.append("rect").attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", "url(#riskgrid)");

    // Glow filter
    const filter = defs.append("filter").attr("id", "riskglow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    type SimNode = RiskNode & d3.SimulationNodeDatum;
    type SimLink = { source: SimNode; target: SimNode; weight: number };

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .map((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return null;
        return { source: s, target: t, weight: e.weight };
      })
      .filter(Boolean) as SimLink[];

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id).distance(110).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => d.type === "claim" ? 38 : 30));

    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const link = g.append("g").selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks).join("line")
      .attr("stroke", EDGE_COLOR)
      .attr("stroke-width", (d) => Math.min(d.weight * 1.2, 4));

    const nodeGroup = g.append("g").selectAll<SVGGElement, SimNode>("g")
      .data(simNodes).join("g")
      .attr("cursor", "grab")
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    nodeGroup.append("circle")
      .attr("r", (d) => d.type === "claim" ? 14 : 9)
      .attr("fill", (d) =>
        d.type === "claim" ? riskColor(d.riskScore ?? 0) : CONCEPT_COLOR
      )
      .attr("filter", "url(#riskglow)")
      .attr("opacity", 0)
      .transition().duration(600).delay((_, i) => i * 40)
      .attr("opacity", 0.9);

    // Add hover interaction after initial transition
    nodeGroup.select<SVGCircleElement>("circle")
      .on("mouseover", function (_, d) {
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 18 : 12);
        link.attr("stroke", (l) =>
          (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
            ? EDGE_HOVER_COLOR : EDGE_COLOR
        );
      })
      .on("mouseout", function (_, d) {
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 14 : 9);
        link.attr("stroke", EDGE_COLOR);
      });

    nodeGroup.append("text")
      .text((d) => d.type === "concept" ? d.label : `R${(d.claimIndex ?? 0) + 1}`)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "claim" ? 4 : 3)
      .attr("font-size", (d) => d.type === "claim" ? "9px" : "7px")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .attr("pointer-events", "none");

    nodeGroup.append("text")
      .filter((d) => d.type === "concept")
      .text((d) => d.label.length > 20 ? d.label.slice(0, 17) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("dy", 22)
      .attr("font-size", "9px")
      .attr("fill", "rgba(148,163,184,0.7)")
      .attr("pointer-events", "none");

    // Tooltip title on claim nodes
    nodeGroup.append("title")
      .text((d) => d.type === "claim" ? d.label : d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges]);

  if (claims.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-vellum animate-fade-in" ref={containerRef}>
      <div className="bg-slate-950 px-5 py-2.5 border-b border-white/5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Claim Risk Map
        </span>
      </div>
      <svg ref={svgRef} className="w-full block" style={{ minHeight: 380 }} />
      <div className="flex flex-wrap items-center gap-4 bg-slate-950 px-5 py-3 border-t border-white/5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="text-[10px] text-slate-400">High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#fb923c]" />
          <span className="text-[10px] text-slate-400">Needs Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
          <span className="text-[10px] text-slate-400">Likely OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />
          <span className="text-[10px] text-slate-400">Concept</span>
        </div>
        <span className="ml-auto text-[10px] text-slate-600">Drag · Scroll to zoom · Hover for details</span>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/frontend && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/frontend/src/components/RiskGraph.tsx
git commit -m "feat: add RiskGraph D3 force-directed visualization for ReviewDocument"
```

---

## Task 11: Overhaul ReviewDocument Page

**Files:**
- Modify: `packages/frontend/src/pages/ReviewDocument.tsx`

**Step 1: Replace ReviewDocument.tsx entirely**

This is the most involved UI task. Replace the full file with the version below. Changes:
- Import `extractTextFromFile` and `SUPPORTED_EXTENSIONS` from `../lib/parseDocument`
- Import `RiskGraph` from `../components/RiskGraph`
- Add `dragOver` state for drop zone styling
- Add drag-and-drop event handlers (`onDragOver`, `onDragLeave`, `onDrop`)
- Add file input `<input type="file">` triggered by button
- Show file name pill when file is loaded
- Add animated stat counters (count-up class)
- Replace "Looking good!" empty state with confetti dots + pop-in animation
- Add RiskGraph between summary stats and the claim rows
- Expand max-w-3xl to max-w-4xl to fit the graph

```tsx
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, AlertCircle, RefreshCw, Info, BarChart3,
  AlertTriangle, CheckCircle2, Upload, X, Sparkles
} from "lucide-react";
import { LIMITS } from "@verities/shared";
import type { ReviewDocumentResponse } from "@verities/shared";
import { reviewDocument } from "../lib/api";
import { extractTextFromFile, SUPPORTED_EXTENSIONS, DocumentParseError } from "../lib/parseDocument";
import Navbar from "../components/Navbar";
import RiskClaimRow from "../components/RiskClaimRow";
import RiskGraph from "../components/RiskGraph";

type Status = "idle" | "parsing" | "loading" | "success" | "error";

// CSS-only confetti dots for "Looking good!" state
const CONFETTI_COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#8B5CF6"];

function ConfettiDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CONFETTI_COLORS.flatMap((color, ci) =>
        [0, 1, 2].map((j) => (
          <div
            key={`${ci}-${j}`}
            className="confetti-dot"
            style={{
              backgroundColor: color,
              left: `${15 + ci * 18 + j * 3}%`,
              top: "20%",
              animationDelay: `${ci * 80 + j * 120}ms`,
              animationDuration: `${1000 + j * 200}ms`,
            }}
          />
        ))
      )}
    </div>
  );
}

export default function ReviewDocument() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReviewDocumentResponse | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordCountColor =
    wordCount > 2000 ? "text-terracotta" : wordCount > 1500 ? "text-amber" : "text-ink-faint";

  const handleFile = useCallback(async (file: File) => {
    setStatus("parsing");
    setError("");
    try {
      const extracted = await extractTextFromFile(file);
      setText(extracted);
      setFileName(file.name);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof DocumentParseError ? err.message : "Failed to parse file");
      setStatus("error");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [handleFile]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const res = await reviewDocument({ text, options: { max_risk_claims: 20 } });
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [text]);

  const clearFile = useCallback(() => {
    setText("");
    setFileName(null);
    setResult(null);
    setStatus("idle");
    setError("");
  }, []);

  const highRiskCount = result?.high_risk_claims.filter((c) => c.risk_score > 0.7).length ?? 0;
  const medRiskCount = result?.high_risk_claims.filter(
    (c) => c.risk_score > 0.4 && c.risk_score <= 0.7
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 animate-rise">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-wash">
              <FileText className="h-5 w-5 text-cerulean" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Review Document
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted ml-13">
            Upload or paste a document to scan for high-risk claims. We'll flag assertions
            most likely to need verification.
          </p>
        </div>

        {/* File upload zone */}
        <div className="space-y-4 animate-rise delay-100">
          <div
            className={`drop-zone p-6 text-center cursor-pointer ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={SUPPORTED_EXTENSIONS.join(",")}
              onChange={handleFileInput}
            />
            {status === "parsing" ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-cerulean animate-spin" />
                <p className="text-sm font-medium text-cerulean">Parsing document...</p>
              </div>
            ) : fileName ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-cerulean shrink-0" />
                <span className="text-sm font-medium text-ink truncate max-w-xs">{fileName}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="rounded-full p-1 text-ink-ghost hover:text-terracotta hover:bg-terracotta-wash transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cerulean-wash animate-float">
                  <Upload className="h-6 w-6 text-cerulean" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Drop a file here, or <span className="text-cerulean">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Max 5 MB
                  </p>
                </div>
                {/* Format badges */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {["PDF", "DOCX", "DOC", "TXT", "MD"].map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-md bg-parchment px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-vellum" />
            <span className="text-xs font-medium text-ink-faint">or paste text below</span>
            <div className="flex-1 border-t border-vellum" />
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your document (up to 2,000 words)..."
            rows={8}
            maxLength={LIMITS.REVIEW_MAX_CHARS}
            className="manuscript-input w-full resize-y px-4 py-3 text-sm"
          />

          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${wordCountColor}`}>
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || status === "loading" || status === "parsing"}
              className="inline-flex items-center gap-2 rounded-xl bg-cerulean px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cerulean/20 transition-all hover:bg-cerulean-light hover:shadow-lg hover:shadow-cerulean/30 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
            >
              {status === "loading" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {status === "loading" ? "Reviewing..." : "Review document"}
            </button>
          </div>
        </div>

        {/* Loading skeletons */}
        {status === "loading" && (
          <div className="mt-8 space-y-3 animate-fade-in">
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="scholarly-card p-4 text-center">
                  <div className="mx-auto mb-2 h-5 w-5 rounded animate-shimmer" />
                  <div className="mx-auto h-6 w-10 rounded animate-shimmer mb-1" />
                  <div className="mx-auto h-3 w-16 rounded animate-shimmer" />
                </div>
              ))}
            </div>
            {/* Graph skeleton */}
            <div className="h-48 rounded-xl animate-shimmer mb-3" />
            {/* Row skeletons */}
            {[0, 1, 2].map((i) => (
              <div key={i} className="scholarly-card p-4">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded animate-shimmer" />
                  <div className="h-1.5 w-full rounded-full animate-shimmer" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 rounded-md animate-shimmer" />
                    <div className="h-5 w-14 rounded-md animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-8 rounded-xl border border-terracotta-border bg-terracotta-wash p-5 animate-slide-up">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
              <div>
                <h3 className="text-sm font-semibold text-terracotta">Something went wrong</h3>
                <p className="mt-1 text-sm text-ink-muted">{error}</p>
                <button
                  onClick={handleSubmit}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-terracotta border border-terracotta-border transition-colors hover:bg-terracotta-wash"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "success" && result && (
          <div className="mt-8">
            {/* Stat cards with count-up animation */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="scholarly-card p-4 text-center animate-pop-in">
                <BarChart3 className="mx-auto mb-1.5 h-5 w-5 text-cerulean" />
                <div className="text-lg font-bold text-ink animate-count-up">
                  {result.total_claims_found}
                </div>
                <div className="text-[11px] font-medium text-ink-faint">Claims Found</div>
              </div>
              <div className="scholarly-card p-4 text-center animate-pop-in delay-75">
                <AlertTriangle className="mx-auto mb-1.5 h-5 w-5 text-terracotta" />
                <div className="text-lg font-bold text-ink animate-count-up delay-75">
                  {highRiskCount}
                </div>
                <div className="text-[11px] font-medium text-ink-faint">High Risk</div>
              </div>
              <div className="scholarly-card p-4 text-center animate-pop-in delay-150">
                <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-amber" />
                <div className="text-lg font-bold text-ink animate-count-up delay-150">
                  {medRiskCount}
                </div>
                <div className="text-[11px] font-medium text-ink-faint">Needs Review</div>
              </div>
            </div>

            {/* Risk Graph */}
            {result.high_risk_claims.length > 0 && (
              <div className="mb-6 animate-fade-in delay-200">
                <RiskGraph claims={result.high_risk_claims} />
              </div>
            )}

            {/* Risk claim rows */}
            {result.high_risk_claims.length > 0 ? (
              <div className="space-y-3">
                {result.high_risk_claims.map((claim, i) => (
                  <RiskClaimRow
                    key={claim.claim_id}
                    claim={claim}
                    index={i}
                    onClick={() => {
                      navigate(`/check?text=${encodeURIComponent(claim.original_text)}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="relative rounded-xl border border-sage-border bg-sage-wash p-10 text-center animate-slide-up overflow-hidden">
                <ConfettiDots />
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage animate-pop-in" />
                <h3 className="text-base font-semibold text-ink animate-fade-up delay-100">
                  Looking good!
                </h3>
                <p className="mt-1.5 text-sm text-ink-muted animate-fade-up delay-200">
                  No high-risk claims were found in your document.
                </p>
              </div>
            )}

            {/* Processing info */}
            <div className="mt-4 text-right text-xs text-ink-faint">
              {result.metadata.words_processed} words processed in{" "}
              {(result.metadata.processing_time_ms / 1000).toFixed(1)}s
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-10 flex items-start gap-2 rounded-lg bg-parchment/50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-ghost" />
          <p className="text-xs leading-relaxed text-ink-faint">
            Verities helps you check — it does not guarantee accuracy. Always consult
            primary sources and use your own judgement for important claims.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/frontend && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Test in browser**

```bash
npm run dev -w packages/frontend
```

Test checklist:
- [ ] File upload zone renders with float animation on icon
- [ ] Dragging a `.txt` file onto zone shows "parsing..." then populates textarea
- [ ] Dragging a `.pdf` file extracts text and shows filename pill
- [ ] `.docx` file extraction works
- [ ] X button clears the file
- [ ] "or paste text below" divider is visible
- [ ] Submit button shows spinner while loading
- [ ] After result: 3 stat cards animate in with pop-in
- [ ] RiskGraph renders below stats
- [ ] RiskClaimRow items have colored left borders
- [ ] "Looking good!" state shows confetti dots

**Step 4: Commit**

```bash
git add packages/frontend/src/pages/ReviewDocument.tsx
git commit -m "feat: file upload (PDF/DOCX/TXT), RiskGraph, animated UI on ReviewDocument"
```

---

## Task 12: Add Open Graph Meta Tags to index.html

**Files:**
- Modify: `packages/frontend/index.html`

**Step 1: Add meta tags**

Replace `packages/frontend/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verities — Fact-Check Your Writing</title>
    <meta name="description" content="Paste your essay or article. Verities extracts each factual claim, checks it against ranked real-world sources, and gives you verdicts, citations, and suggested rewrites." />
    <meta name="theme-color" content="#2563EB" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Verities — Fact-Check Your Writing" />
    <meta property="og:description" content="AI-powered fact checking with real sources, verdicts, and copy-ready citations." />
    <meta property="og:site_name" content="Verities" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Verities — Fact-Check Your Writing" />
    <meta name="twitter:description" content="AI-powered fact checking with real sources, verdicts, and copy-ready citations." />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;0,6..72,800;1,6..72,400;1,6..72,500&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Commit**

```bash
git add packages/frontend/index.html
git commit -m "feat: add Open Graph and Twitter Card meta tags"
```

---

## Task 13: Add Footer to Landing Page

**Files:**
- Modify: `packages/frontend/src/pages/Landing.tsx`

**Step 1: Add footer**

In `packages/frontend/src/pages/Landing.tsx`, append a footer section after the disclaimer section (before the closing `</div>`):

```tsx
{/* Footer */}
<footer className="border-t border-vellum">
  <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-cerulean" />
        <span className="text-sm font-semibold text-ink">Verities</span>
      </div>
      <div className="flex items-center gap-6">
        <Link to="/about" className="text-xs text-ink-faint hover:text-ink transition-colors">
          About
        </Link>
        <Link to="/check" className="text-xs text-ink-faint hover:text-ink transition-colors">
          Check Facts
        </Link>
        <Link to="/review" className="text-xs text-ink-faint hover:text-ink transition-colors">
          Review Document
        </Link>
      </div>
      <p className="text-xs text-ink-ghost">
        © {new Date().getFullYear()} Verities
      </p>
    </div>
  </div>
</footer>
```

**Step 2: Commit**

```bash
git add packages/frontend/src/pages/Landing.tsx
git commit -m "style: add footer to Landing page"
```

---

## Task 14: Write SETUP.md (Local Hosting Instructions)

**Files:**
- Create: `SETUP.md` at repo root

**Step 1: Create SETUP.md**

```markdown
# Local Development Setup

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | `node --version` to check |
| npm | 10+ | Included with Node 20 |
| Groq API key | — | Free at [console.groq.com](https://console.groq.com) — no credit card |

---

## 1. Install dependencies

From the **repo root**:

```bash
npm install
```

This installs all workspace packages (`frontend`, `backend`, `shared`) in one step.

---

## 2. Configure environment

```bash
cp packages/backend/.env.example packages/backend/.env
```

Open `packages/backend/.env` and fill in your Groq key:

```
GROQ_API_KEY=gsk_your_key_here
```

Everything else has working defaults for local development. The database defaults to SQLite (`file:./dev.db`) — no Postgres needed.

---

## 3. Set up the database

```bash
cd packages/backend
npm run prisma:generate:dev
npm run prisma:push:dev
cd ../..
```

This generates the Prisma client for the SQLite dev schema and pushes the schema to `dev.db`.

---

## 4. Start the development servers

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
npm run dev:backend
```
Expected output: `Verities API running on http://localhost:3001`

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```
Expected output: `VITE ready on http://localhost:5173`

---

## 5. Open the app

Navigate to **[http://localhost:5173](http://localhost:5173)**

---

## Optional: Enable Google OAuth Login

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google OAuth 2.0** API
3. Add `http://localhost:3001/auth/google/callback` as an authorized redirect URI
4. Copy the Client ID and Secret into `packages/backend/.env`:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

5. Restart the backend

---

## Optional: Enable Redis Cache

By default the app uses an in-memory LRU cache. For persistent caching:

1. Run Redis locally (e.g. `docker run -p 6379:6379 redis`)
2. Add to `.env`:

```
REDIS_URL=redis://localhost:6379
```

---

## Verify everything is working

Hit the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected:
```json
{ "status": "ok", "database": "connected", "cache": "in-memory" }
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GROQ_API_KEY` error on startup | Add key to `packages/backend/.env` |
| Prisma schema errors | Run `npm run prisma:push:dev` again |
| Port 3001 in use | Change `PORT=3002` in `.env` |
| Port 5173 in use | Vite will auto-increment to 5174 |
| `Cannot find module '@verities/shared'` | Run `npm install` from repo root |
```

**Step 2: Commit**

```bash
git add SETUP.md
git commit -m "docs: add local development setup instructions"
```

---

## Task 15: Write DEPLOY.md (Railway Deployment)

**Files:**
- Create: `DEPLOY.md` at repo root

**Step 1: Create DEPLOY.md**

```markdown
# Production Deployment — Railway

This guide deploys Verities to [Railway](https://railway.app) — backend + PostgreSQL on Railway, frontend as a static site (Railway or Vercel).

---

## Prerequisites

- Railway account (free tier works)
- GitHub repo connected to Railway
- Groq API key (free at [console.groq.com](https://console.groq.com))

---

## Step 1: Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select your Verities repo
3. Railway detects it as a Node.js project

---

## Step 2: Add PostgreSQL

1. In your Railway project dashboard → click **+ New**
2. Select **Database → PostgreSQL**
3. Railway automatically creates a `DATABASE_URL` environment variable in your project

---

## Step 3: Configure the backend service

In Railway, select your main service → **Settings → Build & Deploy**:

| Setting | Value |
|---------|-------|
| Root Directory | `packages/backend` |
| Build Command | `npm run build` |
| Start Command | `node dist/server.js` |
| Watch Paths | `packages/backend/**` |

**Release Command** (runs before each deploy):
```
npx prisma migrate deploy
```

---

## Step 4: Set environment variables

In Railway → your backend service → **Variables**, add:

```
GROQ_API_KEY=gsk_your_key_here
JWT_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.railway.app
```

`DATABASE_URL` is already set automatically by the PostgreSQL plugin.

**Important:** `JWT_SECRET` must be a stable random string. Generate it once:
```bash
openssl rand -hex 32
```
Copy the output and paste it into Railway.

---

## Step 5: Deploy the frontend

### Option A: Railway Static Site

1. In your Railway project → **+ New → Empty Service**
2. Settings:
   - Root Directory: `packages/frontend`
   - Build Command: `npm run build`
   - Start Command: (leave empty — static site)
   - Output Directory: `dist`
3. Add variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

### Option B: Vercel (recommended for frontend)

1. Import your GitHub repo at [vercel.com](https://vercel.com)
2. Set:
   - Framework: **Vite**
   - Root Directory: `packages/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

---

## Step 6: Update CORS

Once your frontend URL is known, update the `FRONTEND_URL` env var in Railway:

```
FRONTEND_URL=https://your-frontend-domain.com
```

---

## Step 7: Verify deployment

1. Visit your backend health endpoint:
   ```
   https://your-backend.railway.app/health
   ```
   Expected: `{ "status": "ok", "database": "connected" }`

2. Visit your frontend URL and submit a test claim

---

## Optional: Enable Google OAuth in Production

1. In Google Cloud Console, add your production callback URL:
   ```
   https://your-backend.railway.app/auth/google/callback
   ```
2. Add to Railway env vars:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://your-backend.railway.app/auth/google/callback
   ```

---

## Optional: Enable Redis Cache

Railway has a Redis plugin:

1. Project → **+ New → Database → Redis**
2. Railway sets `REDIS_URL` automatically

---

## Updating the app

Push to your connected branch → Railway automatically rebuilds and redeploys.

To run database migrations manually:
```bash
npx prisma migrate deploy --schema packages/backend/prisma/schema.prisma
```
```

**Step 2: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add Railway production deployment instructions"
```

---

## Task 16: Final Build Verification

**Step 1: Run TypeScript check across all packages**

```bash
cd packages/shared && npx tsc --noEmit && cd ../..
cd packages/frontend && npx tsc --noEmit && cd ../..
cd packages/backend && npx tsc --noEmit && cd ../..
```

Expected: no errors from any package.

**Step 2: Run production frontend build**

```bash
npm run build:shared && npm run build -w packages/frontend
```

Expected: `dist/` created, `.gz` and `.br` compressed assets present.

**Step 3: Smoke test the dev server**

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Manual checklist:
- [ ] `http://localhost:5173` loads Landing page with animated hero
- [ ] Navbar glass effect activates on scroll
- [ ] `/review` — file upload zone renders
- [ ] Drop a `.txt` file — text appears in textarea
- [ ] Submit document — RiskGraph appears in results
- [ ] RiskClaimRow cards have colored left borders
- [ ] Click a risk claim — navigates to `/check` with prefilled text
- [ ] `/check` — SSE streaming works, ConceptGraph renders
- [ ] `/health` returns `{ "status": "ok" }`

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: Verities v1.0 — file upload, RiskGraph, animated UI, deployment docs"
```
