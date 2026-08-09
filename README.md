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
- **Env-gated everything.** Missing API keys never break the app. The backend runs deterministic dev auth when `CLERK_SECRET_KEY` is unset; the AI module returns structured, data-backed templated responses when `OPENAI_API_KEY` is unset.

## Production deployment

The monorepo deploys as **three isolated applications**. Each Vercel project uses its own
**Root Directory** so builds never pull unrelated workspaces into scope.

| Application | Path            | Package          | Domain            | Host          |
| ----------- | --------------- | ---------------- | ----------------- | ------------- |
| Landing     | `apps/landing`  | `@doloyal/landing` | `doloyal.com`     | Vercel        |
| SaaS app    | `apps/web`      | `@doloyal/web`   | `app.doloyal.com` | Vercel        |
| API         | `apps/api`      | `@doloyal/api`   | `api.doloyal.com` | Node container |

### Vercel (landing + SaaS)

Each Vercel project reads its own `vercel.json` inside the app folder. No root-level
`vercel.json` build is used, and `pnpm install --frozen-lockfile` resolves the whole
workspace from the repo lockfile.

- **Project settings** → set **Root Directory** to the app folder (`apps/landing` / `apps/web`).
- Framework is auto-detected as Next.js; install/build commands come from the app's `vercel.json`.

**Landing (`apps/landing/vercel.json`)**
- Build: `pnpm turbo run build --filter=@doloyal/landing...`
- Output: `.next`
- No environment variables required (static marketing site).

**SaaS (`apps/web/vercel.json`)**
- Build: `pnpm turbo run build --filter=@doloyal/web...` (builds `@doloyal/shared` + `@doloyal/ui` first)
- Output: `.next`
- Required env vars:
  - `NEXT_PUBLIC_API_BASE_URL` → `https://api.doloyal.com`
  - `NEXT_PUBLIC_APP_URL` → `https://app.doloyal.com`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → Google OAuth client id (for Google sign-in)

### API (Node container)

The API is a long-running NestJS + Fastify server with SSE streaming and file uploads —
it is **not** Vercel-serverless compatible. Deploy it as a container (Railway, Render,
Fly.io, ECS, or any Docker host):

```bash
docker build -t doloyal-api -f apps/api/Dockerfile .
docker run -p 4000:4000 --env-file .env doloyal-api
```

Required env vars:

- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — long random string shared with all auth tokens
- `CORS_ORIGIN` — comma-separated frontend origins: `https://app.doloyal.com,https://doloyal.com`
- `API_PORT` — `4000`
- `WEB_BASE_URL` / `PUBLIC_APP_URL` — `https://app.doloyal.com`
- Optional: `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RESEND_API_KEY`, `RESEND_FROM`

Apply migrations before starting:

```bash
pnpm db:deploy   # prisma migrate deploy (safe for production — never reset)
```

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
