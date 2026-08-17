# Doloyal

> AI-powered **Customer Retention Operating System** for local businesses — salons, barber shops, gyms, spas, nail studios, dental clinics, restaurants, cafes, pet grooming, car wash, and any appointment-based local business.

Doloyal is a multi-tenant SaaS that helps businesses grow repeat customers, automate marketing, run loyalty/rewards/memberships, and act on AI-driven retention insights — all from one platform.

---

## Status

This repository contains a **deep vertical slice**: a production-grade architecture with end-to-end working features for the core loop — auth, multi-tenant onboarding, KPI dashboard, customer management, a loyalty points engine, rewards, and an AI assistant. Additional modules (booking UI, QR check-in, campaign builder, admin panel, billing UI, messaging delivery) have their data models in place and surface polished "coming soon" placeholders so they can be extended incrementally.

## Tech stack

| Layer        | Tech                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), React, TypeScript, Tailwind, shadcn/ui, Framer Motion |
| Backend      | NestJS, REST, Prisma ORM                                              |
| Database     | PostgreSQL                                                            |
| Auth         | Clerk (with env-gated mock fallback for zero-config dev)              |
| AI           | OpenAI (function-calling) with rule-based fallback                    |
| Payments     | Stripe + Razorpay (stubbed in this build)                             |
| Messaging    | Resend / Twilio / WhatsApp Business API (stubbed in this build)       |
| File uploads | Cloudinary (stubbed in this build)                                    |
| Tooling      | pnpm workspaces, Turborepo                                            |

## Monorepo layout

```
apps/
  web/      Next.js SaaS app (login + dashboard + all modules) → app.doloyal.com
  landing/  Next.js public marketing site → doloyal.com
  api/      NestJS REST API → api.doloyal.com
packages/
  shared/   Zod schemas, TS types, enums, constants
  ui/       Brand design system (shadcn-based)
```

## Quick start

### Prerequisites

- Node.js ≥ 20
- pnpm 9 (`npm i -g pnpm` or via [corepack](https://nodejs.org/api/corepack.html))
- Docker (for PostgreSQL) — or any reachable Postgres instance

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

> No Docker? Create a Postgres DB and set `DATABASE_URL` in `.env`.

### 3. Configure environment

```bash
cp .env.example .env
```

Everything works **without** API keys — Clerk auth, OpenAI, and other integrations gracefully fall back to dev/mock modes. Add real keys to enable production behavior.

### 4. Set up the database

```bash
pnpm db:generate    # generate Prisma client
pnpm db:migrate     # create/apply migrations
pnpm db:seed        # seed demo business + ~200 customers with 90 days of activity
```

### 5. Run the apps

In two terminals (or use the combined dev command):

```bash
pnpm dev            # runs both web and api via turbo
```

- Web: http://localhost:3000
- API: http://localhost:4000/api

### 6. Explore

With the seed loaded, you'll land on a dashboard pre-populated with 90 days of realistic activity. Try:

- **Dashboard** — KPIs, revenue/customer trends, top customers, recent activity.
- **Customers** — search, filter, open a profile to see lifetime value, points ledger, AI churn risk.
- **Loyalty** — edit point-earning rules, browse the immutable ledger, manual adjustments.
- **Rewards** — create/manage rewards customers can redeem.
- **AI Assistant** — ask "Who are my VIP customers?", "Why are sales down this week?", "Suggest a win-back campaign for inactive customers." Responses are backed by live data.

## Architecture highlights

- **Multi-tenancy via row-level isolation.** Every tenant-scoped table carries `tenantId`. A Prisma middleware injects the active tenant into all queries, making cross-tenant leaks structurally impossible through the data layer.
- **RBAC.** Clerk handles identity; authorization is owned by the app via a `Membership` (user↔tenant+role) model and `@Roles()` decorators enforced by a `RolesGuard`. Roles: Owner, Manager, Receptionist, Staff, Customer.
- **Immutable loyalty ledger.** Points are an append-only ledger (`PointsLedger`) with running balances and per-entry expiry — auditable and correct by construction.
- **Real KPIs.** Every dashboard metric is computed from real data, not cached counts. Aggregations run on indexed columns.
- **Env-gated everything.** In development, missing API keys never break the app: the backend runs deterministic mock auth when `CLERK_SECRET_KEY` is unset and the AI module returns structured templated responses when no provider key is set. **In production these fallbacks are disabled** — auth requires a real token, the AI surfaces real errors, and the app fails loudly instead of showing fake data.

## Production deployment

The monorepo deploys as **three isolated applications**. Each Vercel project uses its own
**Root Directory** so builds never pull unrelated workspaces into scope.

| Application | Path            | Package          | Domain             | Host          |
| ----------- | --------------- | ---------------- | ------------------ | ------------- |
| Landing     | `apps/landing`  | `@doloyal/landing` | `doloyal.com`      | Vercel        |
| SaaS app    | `apps/web`      | `@doloyal/web`   | `www.doloyal.com`  | Vercel        |
| API         | `apps/api`      | `@doloyal/api`   | `api.<you>.com`    | Render        |

### Vercel (landing + SaaS)

Each Vercel project reads its own `vercel.json` inside the app folder. No root-level
`vercel.json` build is used, and `pnpm install --frozen-lockfile` resolves the whole
workspace from the repo lockfile.

- **Project settings** → set **Root Directory** to the app folder (`apps/landing` / `apps/web`).
- Framework is auto-detected as Next.js; install/build commands come from the app's `vercel.json`.
- Prisma Client is generated deterministically on install via the root `postinstall`
  script (`prisma generate --schema=apps/api/prisma/schema.prisma`), so no deployment
  ever needs schema auto-discovery — the `@prisma/client` schema warning cannot occur.

**Landing (`apps/landing/vercel.json`)**
- Build: `pnpm turbo run build --filter=@doloyal/landing...`
- Output: `.next`
- No environment variables required (static marketing site).

**SaaS (`apps/web/vercel.json`)**
- Build: `pnpm turbo run build --filter=@doloyal/web...` (builds `@doloyal/shared` + `@doloyal/ui` first)
- Output: `.next`
- Required env vars (build-time — a missing value silently bakes a broken value into the bundle):
  - `NEXT_PUBLIC_API_BASE_URL` → `https://<your-api-domain>` (the Render API URL)
  - `NEXT_PUBLIC_APP_URL` → `https://www.doloyal.com`
  - `NEXT_PUBLIC_SUPABASE_URL` → e.g. `https://tppkzjslmyoavvcyzhjg.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the Supabase public anon key

> **Why Google login was failing:** `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
> were unset, so the bundle referenced `https://placeholder.supabase.co` and Google OAuth
> was never configured. **Why every API call failed:** `NEXT_PUBLIC_API_BASE_URL` was unset,
> so the bundle called `http://localhost:4000`. Verify with
> `https://www.doloyal.com/_next/static/...` — these env vars must be set **before** the
> next production build.

### API (Render)

The API is a long-running NestJS + Fastify server with SSE streaming and file uploads —
it is **not** Vercel-serverless compatible. Deploy it as a container (Render, Railway,
Fly.io, ECS, or any Docker host).

**Render blueprint**

1. New → **Web Service** → connect the GitHub repo.
2. **Root Directory:** `apps/api`
3. **Build Command:** `pnpm install --frozen-lockfile && pnpm build`
4. **Start Command:** `node dist/main.js`
5. **Instance Type:** Starter (the AI streaming + SSE needs a persistent process).
6. Required env vars (see `.env.example` for full list and comments):
   - `NODE_ENV=production`
   - `DATABASE_URL` → Postgres/Supabase connection string
   - `DIRECT_URL` → Port 5432 direct URL (migrations only)
   - `JWT_SECRET` → strong random string ≥ 32 chars (API refuses to boot otherwise)
   - `CORS_ORIGIN` → `https://www.doloyal.com,http://localhost:3000`
   - `AI_PROVIDER` → `openrouter` (recommended)
   - `AI_MODEL` → `openai/gpt-4o-mini`
   - `OPENROUTER_API_KEY` → provider key
   - `SUPABASE_SERVICE_ROLE_KEY` → server-only Supabase key
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` → Google integration
7. Apply migrations once against the production DB (from a machine with the repo):
   ```bash
   pnpm db:deploy   # prisma migrate deploy (safe for production — never reset)
   ```
8. Set the web app's `NEXT_PUBLIC_API_BASE_URL` to the Render service URL
   (`https://<service>.onrender.com`) and redeploy the Vercel project.

### Supabase & Google Cloud (one-time setup)

- **Supabase Dashboard** → Auth → Providers → enable **Google** with the OAuth client
  ID/secret, and add both callback URLs to **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://www.doloyal.com/auth/callback`
- **Google Cloud Console** → OAuth consent screen → add the same authorized redirect URIs.
- Copy the project URL, anon key, and service-role key into the env vars above.

### CI

`.github/workflows/ci.yml` installs with `--frozen-lockfile`, generates the Prisma client,
typechecks, and runs the full workspace build on every push/PR.

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Run web + api in dev mode                    |
| `pnpm build`        | Build all packages and apps                  |
| `pnpm typecheck`    | Typecheck everything                         |
| `pnpm db:generate`  | Regenerate Prisma client                     |
| `pnpm db:migrate`   | Create + apply a dev migration              |
| `pnpm db:deploy`    | Apply pending migrations (prod)              |
| `pnpm db:seed`      | Seed demo data                               |
| `pnpm db:studio`    | Open Prisma Studio                           |

## License

Proprietary. All rights reserved.
