# Doloyal — Production Deployment

Canonical production URL: **https://doloyal.com** (apex).

## Architecture

```
Browser (https://doloyal.com)
   │  same-origin requests to /backend/*
   ▼
Vercel — Next.js web app  (apps/web)
   │  server-side proxy reads API_BASE_URL
   ▼
Render — NestJS API  (apps/api)
   │  Prisma
   ▼
Supabase — PostgreSQL
```

The browser **never** calls the API directly. It calls same-origin
`/backend/*`, and the route handler at `apps/web/src/app/backend/[...path]/route.ts`
forwards to `API_BASE_URL` server-side.

Two consequences worth knowing:

- **There is no browser CORS dependency.** Every request is same-origin. The
  API's `CORS_ORIGIN` still matters for direct API calls and preflights, but a
  CORS misconfiguration cannot break the dashboard.
- **The API host is never exposed to the browser.** `API_BASE_URL` is a
  server-only variable, so it must **not** be prefixed with `NEXT_PUBLIC_`.
  Do not set `NEXT_PUBLIC_API_BASE_URL` in production — `NEXT_PUBLIC_*` values
  are inlined into the JS bundle at build time, which is what previously baked
  `http://localhost:4000` into production builds.

---

## Step 1 — Supabase (database)

The Supabase project already exists and is used for auth. Prisma must now point
at the same project's Postgres.

1. Supabase Dashboard → **Project Settings → Database**.
2. Copy two connection strings:
   - **Transaction pooler** (port `6543`) → this becomes `DATABASE_URL`.
     Append `?pgbouncer=true&connection_limit=1`.
   - **Direct connection** (port `5432`) → this becomes `DIRECT_URL`.
     Prisma uses it for migrations only; pgbouncer cannot run DDL.
3. Supabase Dashboard → **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

### Create the media storage bucket

Product images and review photos/video are stored in Supabase Storage in
production. (Local development still writes to `apps/api/uploads/` so `pnpm
dev` needs no cloud setup.)

1. Supabase Dashboard → **Storage → New bucket**.
2. Name it `doloyal-media`. Leave it **private** — the API streams bytes
   through its own authorised endpoints rather than serving public URLs, so
   review photos on unapproved reviews stay unreachable.
3. No bucket policies are needed: the API uses the `service_role` key, which
   bypasses row-level security.

If you name the bucket something else, set `SUPABASE_STORAGE_BUCKET` on Render
to match.

### Create the schema

The production database is empty, so this is a first-time schema creation, not
a destructive migration. Run it once from your machine:

```bash
export DATABASE_URL="<supabase pooler url>"
export DIRECT_URL="<supabase direct url>"
pnpm --filter @doloyal/api exec prisma migrate deploy
```

`migrate deploy` is forward-only. It applies pending migrations and never
resets, drops, or seeds. Do **not** run `migrate dev` or `migrate reset`
against production.

Verify:

```bash
pnpm --filter @doloyal/api exec prisma migrate status
```

---

## Step 2 — Render (API)

1. Render Dashboard → **New → Blueprint** → select this repository.
   Render reads `render.yaml` at the repo root and creates the `doloyal-api`
   service, prompting for each secret.
2. Fill in the prompted values (the table below marks which).
3. Deploy, then confirm:

```bash
curl https://<your-service>.onrender.com/health
# {"status":"ok","service":"doloyal-api","database":"ok",...}
```

`database` must read `ok`. If it reads `unavailable`, `DATABASE_URL` is wrong.

> **Do not use Render's free plan.** It sleeps after 15 minutes idle, and the
> ~50s cold start makes the dashboard look broken. `render.yaml` sets `starter`.

---

## Step 3 — Vercel (web)

### Environment variables

Vercel Project → **Settings → Environment Variables**. Set these for the
**Production** environment specifically — Preview values are not inherited by
Production.

| Variable | Value |
| --- | --- |
| `API_BASE_URL` | `https://<your-service>.onrender.com` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | `https://doloyal.com` |

Then **redeploy** — `NEXT_PUBLIC_*` variables are baked in at build time, so
changing them has no effect until a new build runs.

### Domain

Production currently redirects apex → www. To make apex canonical:

Vercel Project → **Settings → Domains** → set `doloyal.com` as the **primary**
domain, and set `www.doloyal.com` to **redirect to** `doloyal.com`.

---

## Step 4 — OAuth redirect URLs

Both of these live in third-party dashboards and cannot be changed from code.

**Supabase Auth** (Google sign-in) → Authentication → URL Configuration:
- Site URL: `https://doloyal.com`
- Redirect allow-list: `https://doloyal.com/auth/callback`
  (keep `http://localhost:3000/auth/callback` for local dev)

**Google Cloud Console** → the Calendar integration OAuth client → Authorized
redirect URIs:
- `https://doloyal.com/app/integrations/callback`

**Resend OAuth** — the registered redirect URI is baked into the client
registration. Because the canonical domain changed to apex, re-register:

```bash
node scripts/register-resend-oauth.mjs --app-url https://doloyal.com
```

Put the returned `client_id` in `RESEND_OAUTH_CLIENT_ID` on Render. There is no
client secret.

---

## Environment variable reference

### Render (API)

| Variable | Required | Without it |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | API starts but every request 500s |
| `DIRECT_URL` | **Yes** | Migrations fail |
| `JWT_SECRET` | **Yes** | API refuses to boot (must be ≥32 chars) |
| `ENCRYPTION_KEY` | **Yes** | Stored integration credentials cannot be decrypted |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Login fails — the API verifies Supabase tokens |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Login fails |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Product/review image uploads fail with a configuration error |
| `SUPABASE_STORAGE_BUCKET` | No | Defaults to `doloyal-media` |
| `APP_URL` | Yes | Links in emails/booking pages fall back to `https://doloyal.com` |
| `CORS_ORIGIN` | No | Falls back to apex + www + localhost |
| `PORT` | Auto | Injected by Render |
| `OPENROUTER_API_KEY` | For AI | Doloyal AI returns a configuration error |
| `WEBSITE_AI_API_KEY` | For website builder | Website generation disabled |
| `RESEND_API_KEY` | For auth email | Password-reset and staff-invite emails **fail silently** — the API still returns success, so users see no error and never get the mail |
| `RESEND_OAUTH_CLIENT_ID`, `RESEND_FROM` | For business email | Per-business campaign/booking email cannot be connected |
| `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | For Calendar | Calendar connect fails |
| `RAZORPAY_KEY_ID` / `_SECRET` | For payments (India) | Checkout unavailable |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | For payments (intl) | Checkout + webhooks unavailable |
| `META_WEBHOOK_VERIFY_TOKEN` | For WhatsApp | Meta webhook handshake fails |

`ENCRYPTION_KEY` warning: rotating it orphans every already-encrypted
integration credential. To rotate safely, move the old value into
`ENCRYPTION_PREVIOUS_KEYS` (comma-separated) rather than replacing it outright.

### Vercel (web)

| Variable | Scope | Required |
| --- | --- | --- |
| `API_BASE_URL` | Server only | **Yes** — this is the fix for "Failed to load dashboard" |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Client | Recommended |
| `NEXT_PUBLIC_API_BASE_URL` | Client | **Leave unset in production** |

---

## Local development is unaffected

None of the above changes local behaviour:

- `apps/api/src/main.ts` prefers `PORT` but still falls back to `API_PORT`,
  then `4000`.
- `getPublicAppUrl()` returns `http://localhost:3000` whenever
  `NODE_ENV !== "production"`.
- `getApiBaseUrl()` keeps its `http://localhost:4000` dev fallback.
- `CORS_ORIGIN` defaults still include `http://localhost:3000`.

Run locally exactly as before with `pnpm dev`.

---

## Verifying the deployment

```bash
# 1. API is up and reaching the database
curl https://<service>.onrender.com/health

# 2. Vercel proxy reaches the API (this is the endpoint that was 503ing)
curl https://doloyal.com/backend/health

# 3. Apex is canonical (www should 30x to apex, not the reverse)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.doloyal.com
```

Step 2 returning the same JSON as step 1 means the original dashboard failure
is resolved.
