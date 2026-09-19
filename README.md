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
| Backend      | NestJS (Fastify), REST, Prisma ORM                                    |
| Database     | PostgreSQL                                                            |
| Auth         | Custom JWT sessions (bcrypt) + Supabase Auth bridge for Google sign-in |
| AI           | OpenAI / OpenRouter / Groq / DeepSeek / Gemini / Anthropic with rule-based fallback |
| Payments     | Razorpay (platform billing, verified server-side) · Stripe (per-tenant booking payments + signed webhooks) |
| Messaging    | Resend (per-business OAuth email) · WhatsApp Business Cloud API (real sends + delivery receipts) |
| File uploads | Inline base64 in Postgres (Cloudinary optional)                       |
| Tooling      | pnpm workspaces, Turborepo                                            |

## Monorepo layout

```
apps/
  web/      Next.js SaaS app (marketing site + dashboard + all modules)
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

Everything works **without** API keys in development — auth runs on a local JWT flow and the AI falls back to structured templated responses. Add real keys to enable production integrations.

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
- **RBAC.** Identity is a `User` row (bcrypt password or Google via the Supabase bridge); authorization is owned by the app via a `Membership` (user↔tenant+role) model and `@Roles()` decorators enforced by a `RolesGuard`. Roles: Owner, Manager, Receptionist, Staff, Customer.
- **Immutable loyalty ledger.** Points are an append-only ledger (`PointsLedger`) with running balances and per-entry expiry — auditable and correct by construction.
- **Real KPIs.** Every dashboard metric is computed from real data, not cached counts. Aggregations run on indexed columns.
- **Env-gated everything.** In development, missing API keys never break the app: mock auth provisions a demo identity when no JWT secret flow is configured, and the AI module returns structured templated responses when no provider key is set. **In production these fallbacks are disabled** — the in-memory DB requires an explicit `DOLOYAL_ALLOW_IN_MEMORY_DB=true` opt-in, `ENCRYPTION_KEY` is mandatory, auth always requires a real token, and the app fails loudly instead of showing fake data.

## Production deployment

The monorepo deploys as **two Vercel projects** from the same repository:

| Application | Root directory | Domain | Runtime |
| --- | --- | --- | --- |
| SaaS + marketing | repository root (`apps/web` build) | `doloyal.com` | Next.js |
| API | `apps/api` | `<project>.vercel.app` | NestJS Fluid Compute |

The frontend browser uses same-origin `/backend/*`; Vercel's Next.js route
proxies those requests to the server-only `API_BASE_URL`. Do not set
`NEXT_PUBLIC_API_BASE_URL` in production.

### Vercel frontend

The repository-root `vercel.json` builds `@doloyal/web`. Required variables:

- `API_BASE_URL=https://<api-project>.vercel.app`
- `NEXT_PUBLIC_APP_URL=https://doloyal.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Vercel API

Import the repository a second time, set **Root Directory** to `apps/api`, and
enable source files outside the root so `@doloyal/shared` is included.
`apps/api/vercel.json` builds the TypeScript API first, then packages
`api/index.js` as the `@vercel/node` handler (`src/main.ts` remains the
local `pnpm dev` listen entry).

The API uses Supabase's port-6543 transaction pooler at runtime, signed direct
Storage uploads for media over Vercel's 4.5 MB payload limit, database-backed
scheduler leases, and Supabase Cron instead of process timers. Request-bound AI
streaming remains enabled; cross-instance UI updates use 10–15 second polling.

Required variables and exact setup, including Hobby cron SQL, are documented in
[`DEPLOYMENT.md`](DEPLOYMENT.md).

Apply production migrations before testing:

```bash
pnpm --filter @doloyal/api exec prisma migrate deploy
```

### Supabase & Google Cloud (one-time setup)

- **Supabase Dashboard** → Auth → Providers → enable **Google** with the OAuth client
  ID/secret, and add both callback URLs to **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://doloyal.com/auth/callback`
- **Google Cloud Console** → OAuth consent screen → add the same authorized redirect URIs.
- Copy the project URL, anon key, and service-role key into the env vars above.

### Resend (email sending, user-level OAuth)

Every business sends email through its **own connected Resend account** — Doloyal
never holds a Resend API key. The flow is OAuth 2.1 with PKCE on a **public client**
(no `client_secret`), so Doloyal needs a registered client ID per environment:

1. Register Doloyal as a Resend OAuth client (Dynamic Client Registration):
   ```bash
   node scripts/register-resend-oauth.mjs --app-url https://doloyal.com   # prod
   node scripts/register-resend-oauth.mjs --app-url http://localhost:3000      # local
   ```
2. Put the returned `client_id` in the API env as `RESEND_OAUTH_CLIENT_ID`.
3. Set `RESEND_FROM` (fallback sender for legacy staff-invite emails only).

At runtime, each business authorizes with Resend in **Integrations → Resend → Connect**
(OAuth popup). Doloyal:

- Exchanges the code with PKCE and stores tokens encrypted per tenant.
- Auto-refreshes access tokens on demand; refresh tokens rotate (serialized per tenant).
- Sends transactional emails (bookings, reminders, rebookings, memberships), workflow
  `send_email` actions, and EMAIL campaigns through the business's Resend account.
- Records every send in `EmailLog`; marks the connection `REAUTH_REQUIRED` when the
  authorization expires or is revoked (the UI shows a "Reconnect" prompt).
- Includes a "Send test email" control and a sending-domains section in the Resend
  manage dialog. Domain management requires the `full_access` scope; without it the UI
  surfaces a reconnect prompt instead of over-requesting permissions.

Each business must verify a sending domain in its own Resend dashboard so emails send
from its own address (Resend rejects unverified senders).

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
