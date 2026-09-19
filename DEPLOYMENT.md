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
Vercel — NestJS API project  (apps/api)
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

If you name the bucket something else, set `SUPABASE_STORAGE_BUCKET` on the API Vercel project
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

## Step 2 — Vercel (API)

Create a **second Vercel project** from this same repository. Do not change the
existing frontend project's root directory.

1. Vercel Dashboard → **Add New → Project** → import this repository again.
2. Name it `doloyal-api`.
3. Set **Production Branch** to `main`. Do not leave it on
   `vercel-backend-migration` — that branch is frozen at `541ba18` and still
   contains the invalid `functions.src/main.ts` glob.
4. Set **Root Directory** to `apps/api`.
   Enable **Include source files outside of the Root Directory** so the
   `@doloyal/shared` workspace package and root pnpm lockfile are available.
4. Leave Framework Preset as **Other**. `apps/api/vercel.json` disables
   auto-detect and deploys `api/index.js` as a single Node serverless
   function that wraps the compiled Nest/Fastify app. Do **not** point
   `functions` at `src/main.ts` or `dist/main.js` — Vercel only matches
   files inside the `api/` directory.
5. Add every variable in the “Vercel API project” table below to Production
   (and Preview if preview APIs should work).
6. Deploy, then confirm:

```bash
curl https://<backend-project>.vercel.app/health
# {"data":{"status":"ok","service":"doloyal-api","database":"ok",...}}
```

`database` must read `ok`. The API intentionally refuses to boot on Vercel if
`DATABASE_URL` is not the port-6543 transaction pooler URL with
`pgbouncer=true&connection_limit=1`.

### Scheduled jobs on the Hobby plan

Hobby Vercel Cron only runs daily, while Doloyal needs minute/hour schedules.
Use **Supabase Cron** (Database → Cron Jobs) to send authenticated GET requests
to the API. Store the same `CRON_SECRET` in Supabase Vault as
`doloyal_cron_secret`, then configure:

| Schedule | API path |
| --- | --- |
| `* * * * *` | `/internal/cron/campaigns` |
| `* * * * *` | `/internal/cron/workflows` |
| `*/2 * * * *` | `/internal/cron/referrals/leaderboards` |
| `*/3 * * * *` | `/internal/cron/referrals/pending-rewards` |
| `*/5 * * * *` | `/internal/cron/referrals/expire-campaigns` |
| `*/5 * * * *` | `/internal/cron/referrals/aggregate-sources` |
| `*/10 * * * *` | `/internal/cron/referrals/expire-links` |
| `*/15 * * * *` | `/internal/cron/referrals/fraud-scan` |
| `0 * * * *` | `/internal/cron/appointments` |

Each request must include:

```text
Authorization: Bearer <CRON_SECRET>
```

The API uses expiring database-backed scheduler leases, so overlapping calls are skipped
instead of sending a campaign, reward, or reminder twice.

---

## Step 3 — Vercel (web)

### Environment variables

Vercel Project → **Settings → Environment Variables**. Set these for the
**Production** environment specifically — Preview values are not inherited by
Production.

| Variable | Value |
| --- | --- |
| `API_BASE_URL` | `https://<backend-project>.vercel.app` (no trailing slash) |
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

Put the returned `client_id` in `RESEND_OAUTH_CLIENT_ID` on the API Vercel project. There is no
client secret.

---

## Environment variable reference

### Vercel API project

| Variable | Required | Without it |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Supabase transaction pooler, port 6543, with `?pgbouncer=true&connection_limit=1`; API refuses to boot if wrong |
| `DIRECT_URL` | **Yes** | Migrations fail |
| `JWT_SECRET` | **Yes** | API refuses to boot (must be ≥32 chars) |
| `ENCRYPTION_KEY` | **Yes** | Stored integration credentials cannot be decrypted |
| `CRON_SECRET` | **Yes** | Supabase Cron requests are rejected; generate a separate random 32+ byte value |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Login fails — the API verifies Supabase tokens |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Login fails |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Product/review image uploads fail with a configuration error |
| `SUPABASE_STORAGE_BUCKET` | No | Defaults to `doloyal-media` |
| `APP_URL` | Yes | Links in emails/booking pages fall back to `https://doloyal.com` |
| `CORS_ORIGIN` | No | Falls back to apex + www + localhost |
| `NODE_ENV` | No | Vercel sets production automatically |
| `OPENROUTER_API_KEY` | For AI | Doloyal AI returns a configuration error |
| `WEBSITE_AI_API_KEY` | For website builder | Website generation disabled |
| `RESEND_API_KEY` | For auth email | Password-reset and staff-invite emails **fail silently** — the API still returns success, so users see no error and never get the mail |
| `RESEND_OAUTH_CLIENT_ID`, `RESEND_FROM` | For business email | Per-business campaign/booking email cannot be connected |
| `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | For Calendar | Calendar connect fails |
| `RAZORPAY_KEY_ID` / `_SECRET` | For payments (India) | Checkout unavailable |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | For payments (intl) | Checkout + webhooks unavailable |
| `META_WEBHOOK_VERIFY_TOKEN` | For WhatsApp | Meta webhook handshake fails |

Sources:

- Supabase → **Connect**: `DATABASE_URL` (Transaction pooler) and
  `DIRECT_URL` (Direct connection).
- Supabase → **Project Settings → API**: project URL, anon key, and
  service-role key.
- Generate `JWT_SECRET`, `ENCRYPTION_KEY`, and `CRON_SECRET` separately with
  `openssl rand -base64 48`; never reuse one secret for another purpose.
- OpenRouter/OpenAI provider dashboard: AI key. NVIDIA Build: `WEBSITE_AI_API_KEY`.
- Resend dashboard: platform `RESEND_API_KEY`; the OAuth registration script
  returns `RESEND_OAUTH_CLIENT_ID`.
- Google Cloud Console: Calendar OAuth client ID and secret.
- Razorpay/Stripe dashboards: live keys and webhook signing secrets.
- Meta Developer dashboard: WhatsApp webhook verify token.

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
curl https://<backend-project>.vercel.app/health

# 2. Vercel proxy reaches the API (this is the endpoint that was 503ing)
curl https://doloyal.com/backend/health

# 3. Apex is canonical (www should 30x to apex, not the reverse)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.doloyal.com
```

Step 2 returning the same JSON as step 1 means the original dashboard failure
is resolved.

Configure provider webhooks against the API project directly so signature
verification receives the provider payload without an extra proxy hop:

```text
Stripe:   https://<backend-project>.vercel.app/integrations/webhook/stripe
WhatsApp: https://<backend-project>.vercel.app/integrations/webhook/whatsapp
```
