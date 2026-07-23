# AI Helpdesk Platform

An IT helpdesk application where users can file tickets manually or by chatting with an AI assistant that extracts structured ticket details automatically. Built as a full-stack TypeScript monorepo to explore tool-calling AI integration, Redis-backed rate limiting, and role-based access control end to end.

**Live demo:** [link] · **API docs:** [link] · Demo login: `user@demo.com` / `agent@demo.com` (see [seed data](#seed-data))

<!-- ![screenshot](docs/screenshots/dashboard.png) -->

## Why this exists

Most portfolio CRUD apps stop at "create, read, update, delete." This one is built around three problems that come up in real production systems:

- **Turning unstructured input into structured data.** The AI chat path uses tool/function calling (Gemini) so the model returns a validated `{ title, description, category, priority }` object instead of free text that has to be parsed and guessed at.
- **Bounding the cost of an AI feature.** Every account is capped at 10 AI messages/day, enforced with a Redis-backed counter — not just a UI limit, but a real server-side guard.
- **Two producers, one contract.** Manual form submissions and AI-extracted tickets both flow through the same `TicketsService` and the same validation rules, so the AI path can never create a ticket the manual path wouldn't allow.

## Features

- Email/password auth with JWT access + refresh tokens
- Role-based authorization (`CUSTOMER`, `AGENT`, `ADMIN`)
- Ticket creation — manual form or AI chat, converging on one shared validation path
- AI assistant with daily rate limiting (10 requests/day/user, Redis-backed)
- Login rate limiting — 5 attempts / 15 min, keyed on email + IP (Redis-backed)
- Registration protected by Cloudflare Turnstile CAPTCHA
- IP-based rate limiting on auth endpoints (hashed IPs, not stored raw)
- Ticket lifecycle: `OPEN → IN_PROGRESS → WAITING_FOR_CUSTOMER → RESOLVED → CLOSED`
- Agent dashboard for triage and assignment
- Dockerized local dev environment (Postgres + Redis)

Not yet built — see [Roadmap](#roadmap).

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js, TypeScript, Tailwind CSS |
| **Backend** | NestJS, Prisma, PostgreSQL |
| **AI** | Gemini API (function calling) |
| **Infra** | Redis (rate limiting), Docker Compose (local dev) |
| **Deployment** | Vercel (frontend), IBM Code Engine (backend), Neon (Postgres), Upstash (Redis) |

## Architecture

```
Next.js (Vercel)
     │
     ▼
NestJS API (IBM Code Engine)
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

One `RateLimitGuard` (Redis-backed) is reused across three surfaces with different policies: AI chat (10 req/day/user), login (5 attempts/15 min, email+IP), and registration (Cloudflare Turnstile instead of a counter, since CAPTCHA fits a one-shot signup better than a request counter).

## Getting started

```bash
git clone https://github.com/<you>/helpdesk-ai-platform.git
cd helpdesk-ai-platform
pnpm install

cp .env.example .env
# fill in DATABASE_URL, JWT secrets, GEMINI_API_KEY, Redis credentials

docker-compose up -d          # local Postgres + Redis
pnpm --filter backend prisma migrate dev
pnpm --filter backend prisma db seed

pnpm dev                      # runs frontend + backend together
```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:3001`.

### Seed data

`prisma/seed.ts` creates a demo customer, an agent, and a handful of sample tickets in different statuses, so the app isn't empty on first run.

## Environment variables

See [`.env.example`](.env.example) for the full list. Notable ones:

| Variable | Purpose |
|---|---|
| `AI_DAILY_LIMIT` | Max AI chat messages per user per day (default: 10) |
| `GEMINI_API_KEY` | Gemini API key for AI ticket extraction |
| `REDIS_URL` / `REDIS_TOKEN` | Upstash REST credentials for rate limiting |
| `LOGIN_RATE_LIMIT_ATTEMPTS` | Failed login attempts before lockout (default: 5) |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | Lockout window in minutes (default: 15) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile keys for registration CAPTCHA |
| `FRONTEND_URL` | Used for CORS config in the NestJS app |

## Project structure

```
frontend/       Next.js app
backend/        NestJS API, Prisma schema and migrations
packages/shared/  Types and DTOs shared by both apps
docs/            Architecture, database, and API notes
```

## Roadmap

Cut from v1 deliberately, to keep the initial build finished and demoable rather than sprawling:

- **Knowledge base / RAG** — `KnowledgeArticle` model already exists in the schema; adding `pgvector` embeddings and a retrieval step to the AI assistant is the next planned feature.
- **File attachments** on tickets (screenshots, logs)
- **Email notifications** on ticket status changes
- **Admin analytics dashboard** (ticket volume, AI usage trends)

## License

MIT
