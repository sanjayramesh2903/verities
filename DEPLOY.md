# Railway Deployment

This guide walks through deploying Verities to [Railway](https://railway.app) — one service for the backend and one for the frontend (or serve the frontend build as static files from the backend).

---

## Architecture on Railway

```
Railway Project
├── Backend service    (Node.js, port $PORT)
└── Frontend service   (Static / Nixpacks build)
```

A free PostgreSQL database is provisioned inside the same Railway project.

---

## 1. Create a Railway project

1. Sign in at [railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo** → connect your repo.
3. Railway will detect two deployable services (`packages/frontend`, `packages/backend`). You can also add them manually.

---

## 2. Provision a PostgreSQL database

Inside your Railway project:

1. Click **New** → **Database** → **PostgreSQL**.
2. Railway creates the database and sets `DATABASE_URL` automatically in the project.
3. In your **Backend** service → **Variables**, click **Add Reference** and select `DATABASE_URL` from the database service.

---

## 3. Configure the Backend service

### Root directory
Set the **Root Directory** for the backend service to:
```
packages/backend
```

### Build command
```bash
npm install && npm run build
```
> Railway runs this from the service root (`packages/backend`). The workspace symlinks for `@verities/shared` are resolved automatically.

### Start command
```bash
node dist/server.js
```

### Environment variables

| Variable | Value | Required |
|----------|-------|----------|
| `GROQ_API_KEY` | `gsk_...` from [console.groq.com](https://console.groq.com) | Yes |
| `DATABASE_URL` | *(reference the PostgreSQL service)* | Yes |
| `JWT_SECRET` | A long random string (`openssl rand -hex 32`) | Strongly recommended |
| `FRONTEND_URL` | Your frontend Railway URL (e.g. `https://verities-frontend.up.railway.app`) | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | *(Railway sets this automatically)* | Auto |
| `CONTENT_FILTER_ENABLED` | `true` | Optional |

> **JWT_SECRET:** If not set, the secret is auto-generated on every restart and all sessions become invalid. Always set this in production.

---

## 4. Run database migrations

After the backend deploys for the first time, run the migration:

1. Go to your **Backend** service in Railway.
2. Click **Settings** → **Deploy** → open the **Shell** tab (or use Railway CLI).
3. Run:
   ```bash
   npx prisma migrate deploy
   ```
   Or if you only need schema push:
   ```bash
   npx prisma db push
   ```

Alternatively, add a **Deploy command** that runs migrations before starting:

```bash
npx prisma migrate deploy && node dist/server.js
```

---

## 5. Configure the Frontend service

### Root directory
```
packages/frontend
```

### Build command
```bash
npm install && npm run build
```

> This runs `vite build`. The shared package is a workspace dependency resolved during install.

### Output directory (for static serving)
```
dist
```

Railway can serve the `dist/` folder as static files automatically if you set the **Service Type** to **Static**.

### Environment variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your backend Railway URL (e.g. `https://verities-backend.up.railway.app`) |

> If `VITE_API_URL` is not set, the frontend defaults to `http://localhost:3001`. Set this so the production build points to your real backend.

---

## 6. Check the frontend API client

Open `packages/frontend/src/lib/api.ts` and confirm the base URL reads from the env variable:

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
```

If it is hardcoded, update it to use `import.meta.env.VITE_API_URL`.

---

## 7. Custom domain (optional)

In Railway, open a service → **Settings** → **Domains** → **Add Custom Domain**. Point your DNS CNAME to the Railway-provided host.

---

## 8. Post-deploy checklist

- [ ] Backend health check: `GET https://<backend-url>/health` returns `{ status: "ok" }`
- [ ] Frontend loads at `https://<frontend-url>`
- [ ] Paste text on `/check` — claim analysis returns results
- [ ] Upload a PDF on `/review` — file is parsed and scanned
- [ ] No CORS errors in browser console
- [ ] `JWT_SECRET` is set in backend env vars

---

## Railway CLI (alternative to the dashboard)

```bash
npm install -g @railway/cli
railway login
railway link        # link to your project
railway up          # deploy current directory
railway logs        # stream logs
railway shell       # open a shell in the deployed container
```

---

## Environment variable reference

### Backend (`.env` or Railway Variables)

```env
# Required
GROQ_API_KEY=gsk_...
DATABASE_URL=postgresql://...
NODE_ENV=production
FRONTEND_URL=https://your-frontend.up.railway.app

# Strongly recommended
JWT_SECRET=<openssl rand -hex 32>

# Optional
JWT_EXPIRY=7d
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-backend.up.railway.app/auth/google/callback
CONTENT_FILTER_ENABLED=true
PORT=3001
```

### Frontend (Vite build-time)

```env
VITE_API_URL=https://your-backend.up.railway.app
```
