# Deployment Guide

## Free stack (no credit card required)

| Service | Purpose | Free limits |
|---------|---------|-------------|
| [Neon](https://neon.tech) | PostgreSQL database | 0.5 GB storage, auto-suspend when idle |
| [Koyeb](https://koyeb.com) | Node.js backend | 2 eco apps, 512 MB RAM, cold starts after inactivity |
| [Vercel](https://vercel.com) | Frontend (static) | Unlimited bandwidth, global CDN |

> **Cold starts:** Koyeb eco instances sleep after ~10 minutes of no traffic. The first request after sleeping takes ~10–30 seconds. This is fine for personal or low-traffic projects. Upgrade to a Koyeb Starter instance ($5.50/month) to stay always-on.

---

## Step 1 — Database on Neon

1. Sign up at [neon.tech](https://neon.tech) (GitHub login works).
2. Click **New Project** → give it a name (e.g. `verities`).
3. Neon creates a PostgreSQL database and shows you a connection string. Copy it — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this tab open — you'll paste this as `DATABASE_URL` in the backend.

---

## Step 2 — Backend on Koyeb

### 2a. Create the app

1. Sign up at [koyeb.com](https://app.koyeb.com) (GitHub login works, no credit card).
2. Click **Create App** → **GitHub** → connect your repo.
3. Choose your repo and the `main` branch.

### 2b. Configure the build

| Field | Value |
|-------|-------|
| **Builder** | Buildpack |
| **Build command** | `npm ci && npm run build:shared && npm run build -w packages/backend` |
| **Start command** | `node packages/backend/dist/server.js` |
| **Instance type** | Eco (free) |
| **Port** | `3001` |

> Koyeb runs from the repository root, so the build command builds the shared types first, then the backend.

### 2c. Set environment variables

In **Environment variables**, add:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `gsk_...` from [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A random secret — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel frontend URL (add this after Step 3, then redeploy) |
| `CONTENT_FILTER_ENABLED` | `true` |

> Leave `PORT` unset — Koyeb injects it automatically.

### 2d. Deploy and run migrations

1. Click **Deploy**. Koyeb will build and start the backend (~2 minutes).
2. Once the service shows **Healthy**, open the Koyeb shell (or use the logs tab) and run:
   ```bash
   npx prisma migrate deploy --schema packages/backend/prisma/schema.prisma
   ```
   Or add the migration to the start command:
   ```
   npx prisma migrate deploy --schema packages/backend/prisma/schema.prisma && node packages/backend/dist/server.js
   ```

3. Note your backend URL (e.g. `https://verities-backend-xxxx.koyeb.app`) — you'll need it for Step 3.

### 2e. Test the backend

```
GET https://verities-backend-xxxx.koyeb.app/health
```

Should return: `{ "status": "ok" }`

---

## Step 3 — Frontend on Vercel

### 3a. Import the project

1. Sign up at [vercel.com](https://vercel.com) (GitHub login works, no credit card).
2. Click **Add New → Project** → import your GitHub repo.

### 3b. Configure the build

Vercel may auto-detect Vite. Override these settings:

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `.` *(keep as repo root — needed for monorepo)* |
| **Build Command** | `npm run build:shared && npm run build -w packages/frontend` |
| **Output Directory** | `packages/frontend/dist` |
| **Install Command** | `npm ci` |

### 3c. Set environment variables

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Koyeb backend URL (e.g. `https://verities-backend-xxxx.koyeb.app`) |

> `VITE_API_URL` is baked into the static build at build time. If you change the backend URL later, trigger a Vercel redeploy.

### 3d. Deploy

Click **Deploy**. Vercel builds the frontend (~1 minute) and gives you a URL like `https://verities.vercel.app`.

---

## Step 4 — Wire the two services together

1. Copy your Vercel frontend URL.
2. In Koyeb → your backend service → **Environment** → update `FRONTEND_URL` to your Vercel URL.
3. Click **Redeploy** on the Koyeb service.

This ensures CORS only allows requests from your frontend in production.

---

## Post-deploy checklist

- [ ] `GET https://<backend>/health` returns `{ "status": "ok" }`
- [ ] Frontend loads at `https://<your-app>.vercel.app`
- [ ] Paste text on `/check` — claim analysis returns results
- [ ] Upload a PDF on `/review` — file is parsed and scanned
- [ ] No CORS errors in browser console (DevTools → Network)
- [ ] `JWT_SECRET` is set in Koyeb environment variables
- [ ] `FRONTEND_URL` in Koyeb matches your exact Vercel URL

---

## Custom domain (optional)

**Vercel:** Settings → Domains → Add → point your DNS CNAME to `cname.vercel-dns.com`.

**Koyeb:** Service → Settings → Domains → Add custom domain → update your DNS.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| First request takes 30s | Koyeb eco cold start | Expected — upgrade to Starter to eliminate |
| CORS errors in browser | `FRONTEND_URL` mismatch | Update it in Koyeb env to match exact Vercel URL |
| `PrismaClientInitializationError` | Migrations not run | Run `npx prisma migrate deploy` in Koyeb shell |
| `GROQ_API_KEY invalid` | Wrong key | Check console.groq.com — key starts with `gsk_` |
| Vercel build fails with "module not found" | Build order wrong | Ensure Build Command starts with `npm run build:shared &&` |
| Neon connection timeout | DB auto-suspended | First query wakes it up — takes ~1s, then normal |

---

## Environment variable reference

### Backend (Koyeb environment variables)

```env
GROQ_API_KEY=gsk_...
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=<64 hex chars>
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
CONTENT_FILTER_ENABLED=true

# Optional
JWT_EXPIRY=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://verities-backend-xxxx.koyeb.app/auth/google/callback
```

### Frontend (Vercel environment variables — build-time)

```env
VITE_API_URL=https://verities-backend-xxxx.koyeb.app
```

---

## Paid alternatives (no cold starts)

If cold starts are unacceptable and you're ready to pay a small amount:

| Option | Cost | Notes |
|--------|------|-------|
| Koyeb Starter instance | ~$5.50/month | Always-on, same setup as above |
| [Railway](https://railway.app) | ~$5–15/month | One-click monorepo deploy, PostgreSQL included |
| [Fly.io](https://fly.io) | ~$1–5/month | Requires credit card, 3 free VMs |
