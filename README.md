# AI Helpdesk Platform

An IT helpdesk application where users can file tickets manually or by chatting with an AI assistant that extracts structured ticket details automatically. Built as a full-stack TypeScript monorepo to explore tool-calling AI integration, Redis-backed rate limiting, and role-based access control end to end.

**Live demo:** not yet deployed — tracked in [Roadmap](#roadmap), coming after the frontend.  
**Demo login:** `user@demo.com` / `agent@demo.com` (see [seed data](#seed-data))

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
     ├── users/         self-service account management
     ├── tickets/       manual ticket CRUD + messages, shared validation
     ├── ai/             Gemini tool-calling, extracts structured tickets
     └── rate-limit/    Redis-backed guard, reused by ai/ and auth/
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

Then, in two separate terminals:

```bash
npm run start:dev --workspace=backend   # http://localhost:3001
npm run dev --workspace=frontend        # http://localhost:3000
```

### Seed data

`backend/prisma/seed.ts` creates a demo customer, an agent, and nine sample tickets spanning every `TicketStatus` and mixed priorities, so the app isn't empty on first run.

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

Cut from v1 deliberately, to keep the initial build finished and demoable rather than sprawling:

- **AI chat ticket path** — Gemini tool-calling into the same `TicketsService.create()` used by the manual form.
- **Redis-backed rate limiting** — AI chat (10 req/day/user) and login (5 attempts/15 min, email+IP), plus Cloudflare Turnstile on registration.
- **Agent dashboard** — queue view, filtering, and ticket assignment; agent-driven status transitions beyond the current customer-only close/reopen.
- **Ticket lifecycle** — `OPEN → IN_PROGRESS → RESOLVED → CLOSED`, surfaced in the dashboard.
- **Knowledge base / RAG** — a `KnowledgeArticle` model plus `pgvector` embeddings and a retrieval step for the AI assistant.
- **Attachment links** on tickets — third-party URLs (e.g. a screenshot or log hosted elsewhere) rather than server-side file uploads, keeping the backend stateless with respect to file storage.
- **Email notifications** on ticket status changes
- **Admin analytics dashboard** (ticket volume, AI usage trends)

## License

MIT
