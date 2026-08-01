# AI Helpdesk Platform

An IT helpdesk application where users can file tickets manually or by chatting with an AI assistant that extracts structured ticket details automatically. Built as a full-stack TypeScript monorepo to explore tool-calling AI integration, Redis-backed rate limiting, and role-based access control end to end.

**Live demo:** https://it-helpdesk.zoltanmolnar.eu/ — deployment planned. The backend API is not deployed yet, and frontend development has not started yet (tracked in [Roadmap](#roadmap), step 10).  
**Demo login:** `admin@helpdesk.dev` / `agent@helpdesk.dev` / `customer@helpdesk.dev` — password `password123` for all three (see [seed data](#seed-data))

**API docs:** [docs/api-endpoints.md](https://github.com/Molnar-Zoltan/it-helpdesk/blob/main/docs/api-endpoints.md) 

<!-- ![screenshot](docs/screenshots/dashboard.png) -->

## Why this exists

Most portfolio CRUD apps stop at "create, read, update, delete." This one is built around three problems that come up in real production systems:

- **Turning unstructured input into structured data.** The AI chat path uses tool/function calling (Gemini) so the model returns a validated `{ title, description, category, priority }` object instead of free text that has to be parsed and guessed at.
- **Bounding the cost of an AI feature.** Every account is capped at 10 AI messages/day, enforced with a Redis-backed counter — not just a UI limit, but a real server-side guard.
- **Two producers, one contract.** Manual form submissions and AI-extracted tickets both flow through the same `TicketsService` and the same validation rules, so the AI path can never create a ticket the manual path wouldn't allow.

## Features

- Dockerized local dev environment (Postgres + Redis)
- Email/password auth with JWT access + refresh tokens (rotation on refresh, revocation on logout)
- Role-based authorization (`CUSTOMER`, `AGENT`, `ADMIN`)
- Self-service account management: update name, change password, change email, delete account — all under `/users/me`, documented in [docs/api-endpoints.md](docs/api-endpoints.md)
- Session-aware token revocation: password and email changes revoke every other active session while preserving the one that made the change, via a `refreshTokenId` claim embedded in the access token
- GDPR-compliant account deletion: user data is hard-deleted, but their tickets/messages are anonymized rather than destroyed, preserving operational history for the other party (see [docs/schema.md](docs/schema.md#gdpr--account-deletion-behavior))
- Manual ticket creation, end to end: customers can create, list (paginated & sortable), view, close, and reopen their own tickets, and post/read messages on a ticket's thread — documented in [docs/api-endpoints.md](docs/api-endpoints.md#tickets-tickets)

Not yet built — see [Roadmap](#roadmap).

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js, TypeScript, Tailwind CSS |
| **Backend** | NestJS, Prisma ORM 7 (driver adapters, Rust-free client), PostgreSQL |
| **AI** | Gemini API (function calling) |
| **Infra** | Redis via ioredis (rate limiting), Docker Compose (local dev) |
| **Deployment** | Vercel (frontend), Google Cloud Run (backend), Neon (Postgres), Upstash (Redis) |
| **Tooling** | npm workspaces monorepo |

## Architecture

```
Next.js (Vercel)
     │
     ▼
NestJS API (Google Cloud Run)
     ├── auth/         JWT issuance, refresh, guards
     ├── tickets/       manual + AI-created tickets, shared validation
     ├── ai/             Gemini tool-calling, extracts structured tickets
     ├── rate-limit/    Redis-backed guard, reused by ai/ and auth/
     └── users/
     │
     ├──► PostgreSQL (Neon)
     └──► Redis (Upstash)
```

Manual ticket submissions and AI-chat ticket submissions are two separate entry points that both call the same `TicketsService.create()` — see [docs/architecture.md](docs/architecture.md) for the full flow diagram.

One `RateLimitGuard` (Redis-backed) will be reused across three surfaces with different policies: AI chat (10 req/day/user), login (5 attempts/15 min, email+IP), and registration (Cloudflare Turnstile instead of a counter, since CAPTCHA fits a one-shot signup better than a request counter). See [Roadmap](#roadmap) — this guard isn't wired in yet.

Redis will be accessed over a plain TCP connection via `ioredis` rather than Upstash's REST client, so the same connection code works unchanged against the local Docker Redis container and against Upstash in production — just a different `REDIS_URL`.

## Getting started

```bash
git clone https://github.com/Molnar-Zoltan/it-helpdesk.git
cd it-helpdesk
npm install

cp backend/.env.example backend/.env
# fill in DATABASE_URL, JWT secrets, GEMINI_API_KEY, REDIS_URL

docker-compose up -d                          # local Postgres + Redis
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
```

Then start both apps at once:

```bash
npm run dev   # runs frontend + backend concurrently via `concurrently`
              # frontend → http://localhost:3000
              # backend  → http://localhost:3001
```

Or run them separately, one per terminal — the two commands are identical apart from the `--workspace` flag:

```bash
npm run dev --workspace=backend    # http://localhost:3001
npm run dev --workspace=frontend   # http://localhost:3000
```

### Seed data

`backend/prisma/seed.ts` creates three demo accounts — an admin, an agent, and a customer — plus nine sample tickets (all owned by the demo customer, assigned to the demo agent) spanning every `TicketStatus` and a mix of priorities, with one message on the first ticket, so the app isn't empty on first run:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@helpdesk.dev` | `password123` |
| Agent | `agent@helpdesk.dev` | `password123` |
| Customer | `customer@helpdesk.dev` | `password123` |

### Git hooks

`npm install` at the root sets up Husky automatically (`prepare` script). Two hooks run locally:

- **`pre-commit`** — runs [lint-staged](https://github.com/okonet/lint-staged), scoped per workspace: ESLint `--fix` for staged `backend/` and `frontend/` files, Prettier `--write` for `packages/shared/`. Auto-fixable issues are silently corrected and re-staged; genuinely unfixable errors block the commit.
- **`commit-msg`** — runs [commitlint](https://commitlint.js.org/) against the [conventional commit](https://www.conventionalcommits.org/) format already used throughout this repo's history (e.g. `feat(auth): add JWT refresh flow`).

Full type-checking (`tsc --noEmit`) is deliberately **not** run in `pre-commit` — it's too slow for a hook that fires on every commit and tends to push people toward `--no-verify`. It belongs in a `pre-push` hook or CI, neither of which exist yet (tracked as a follow-up).

## Environment variables

Each app owns its own env file — see [`backend/.env.example`](backend/.env.example) for the full backend list. Notable ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, used by Prisma's `datasource` config and driver adapter |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access and refresh tokens |
| `AI_DAILY_LIMIT` | Max AI chat messages per user per day (default: 10) |
| `GEMINI_API_KEY` | Gemini API key for AI ticket extraction |
| `REDIS_URL` | Redis connection string — `redis://localhost:6379` locally, `rediss://default:<password>@<host>:6379` on Upstash |
| `LOGIN_RATE_LIMIT_ATTEMPTS` | Failed login attempts before lockout (default: 5) |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | Lockout window in minutes (default: 15) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile keys for registration CAPTCHA |
| `FRONTEND_URL` | Used for CORS config in the NestJS app |

The frontend will get its own `frontend/.env.example` once it needs client-side config (e.g. the public Turnstile site key), following Next.js's `NEXT_PUBLIC_` convention.

## Project structure

```
frontend/              Next.js app
backend/                NestJS API, Prisma schema/migrations, backend/.env.example
packages/shared/      Types and DTOs shared by both apps
docs/                    Architecture, database, and API notes
```

## Roadmap

Built as a vertical slice per step (DB → API → UI), backend before frontend, so each step ships something demoable rather than sprawling.

**Done**

1. ✅ Monorepo scaffold (frontend/backend/packages/shared, docker-compose Postgres + Redis)
2. ✅ Prisma schema (User, Ticket, Message, AiUsage, IpUsage, RefreshToken) + migration + seed
3. ✅ Auth backend (register, login, JWT, refresh-with-rotation, logout-revocation)
   - 3.5 ✅ Self-service account management (`/users/me` — profile, password, email, delete)
   - 3.6 ✅ Validation hardening (emoji blocking, name/email format, password strength, HIBP check)
   - 3.7 ✅ Pre-commit hooks (Husky + lint-staged + commitlint)
   - 3.8 ✅ Centralized constants/strings
   - 3.9 ✅ Status homepage (replaced Next.js default)
4. ✅ Manual ticket creation, backend
   - 4.1.1 ✅ `POST /tickets`
   - 4.1.2 ✅ `GET /tickets` (list own)
   - 4.1.3 ✅ `GET /tickets/:id`
   - 4.1.4 ✅ Pagination and sorting on `GET /tickets`
   - 4.1.5 ✅ `PATCH /tickets/:id/close` (customer-initiated close)
   - 4.1.6 ✅ `POST`/`GET /tickets/:id/messages` (ticket comment thread)
   - 4.1.7 ✅ `PATCH /tickets/:id/reopen` (customer-initiated reopen)
   - 4.1.8 ✅ Docs pass — README, `api-endpoints.md`, `architecture.md`, `schema.md` updated for all of Step 4
   - 4.1.9 ✅ Extracted seed/demo data into `packages/shared/src/demo-data/` (fixed IDs, relative `daysAgo` offsets instead of frozen timestamps, plaintext demo password kept separate from backend-only bcrypt hashing) — `backend/prisma/seed.ts` now consumes it instead of owning the data inline. Sets up a single source of truth the frontend's planned MSW offline-mode mocking (Roadmap step 5+) will reuse, so the demo looks the same whether the real backend is reachable or not. Also fixed a bug found in the process: the admin seed account never had `role: ADMIN` set, so it silently seeded as `CUSTOMER`.

**Left**

5. ⬜ Frontend — Next.js UI for auth + ticket creation/viewing
6. ⬜ Redis login rate limiting (5 attempts / 15 min)
   - 6.1 Backend — `RateLimitGuard` on `/auth/login`
   - 6.2 Frontend — surface lockout state/messaging to the user
7. ⬜ Cloudflare Turnstile on registration
8. ⬜ Agent dashboard
   - 8.1 Backend — queue/filtering/assignment endpoints, agent-driven status transitions beyond the current customer-only close/reopen
   - 8.2 Frontend — dashboard UI
9. ⬜ AI chat ticket path
   - 9.1 Backend — Gemini tool-calling into `TicketsService.create()`
   - 9.2 Frontend — chat UI
   - 9.3 AI daily rate limit (Redis-backed, `AI_DAILY_LIMIT` = 10/day/user)
10. ⬜ Deploy (Google Cloud Run backend, Vercel frontend, Neon/Upstash) + README polish

Also on the list, not yet slotted into a numbered step:

- **Ticket lifecycle** — `OPEN → IN_PROGRESS → RESOLVED → CLOSED`, surfaced in the dashboard.
- **Knowledge base / RAG** — a `KnowledgeArticle` model plus `pgvector` embeddings and a retrieval step for the AI assistant.
- **Attachment links** on tickets — third-party URLs (e.g. a screenshot or log hosted elsewhere) rather than server-side file uploads, keeping the backend stateless with respect to file storage.
- **Email notifications** on ticket status changes
- **Admin analytics dashboard** (ticket volume, AI usage trends)

## License

MIT
