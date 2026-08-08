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
  web/      Next.js frontend (landing + app)
  api/      NestJS REST API
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
