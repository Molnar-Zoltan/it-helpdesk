# AI Helpdesk Platform

An IT helpdesk application where users can file tickets manually or by chatting with an AI assistant that extracts structured ticket details automatically. Built as a full-stack TypeScript monorepo to explore tool-calling AI integration, Redis-backed rate limiting, and role-based access control end to end.

**Live demo:** https://it-helpdesk.zoltanmolnar.eu/ — deployed and under active development, not the final release. Auth, account self-service, and manual ticket filing (create, list, view, close, reopen, message) are all live end to end; the AI chat path and agent dashboard aren't built yet — see [Roadmap](#roadmap).  
**Demo login:** `admin@helpdesk.dev` / `agent@helpdesk.dev` / `customer@helpdesk.dev` — password `password123` for all three (see [seed data](#seed-data))

**API docs:** [docs/api-endpoints.md](https://github.com/Molnar-Zoltan/it-helpdesk/blob/main/docs/api-endpoints.md) 

<!-- ![screenshot](docs/screenshots/dashboard.png) -->

## Why this exists

Most portfolio CRUD apps stop at "create, read, update, delete." This one is built to work through three problems that show up in real production systems, not just ship a form:

- **Turning unstructured input into structured data.** The planned AI chat path will use tool/function calling (Gemini) so the model returns a validated `{ title, description, category, priority }` object instead of free text that has to be parsed and guessed at.
- **Bounding the cost of an AI feature.** AI messages will be capped per account per day, enforced with a Redis-backed counter — not just a UI limit, but a real server-side guard.
- **Two producers, one contract.** Manual form submissions and AI-extracted tickets will both flow through the same `TicketsService` and the same validation rules, so the AI path can never create a ticket the manual path wouldn't allow.

## Features

- Dockerized local dev environment (Postgres + Redis)
- Email/password auth with JWT access + refresh tokens (rotation on refresh, revocation on logout)
- Role-based authorization (`CUSTOMER`, `AGENT`, `ADMIN`)
- Self-service account management: update name, change password, change email, delete account — all under `/users/me`, documented in [docs/api-endpoints.md](docs/api-endpoints.md)
- Session-aware token revocation: password and email changes revoke every other active session while preserving the one that made the change, via a `refreshTokenId` claim embedded in the access token
- GDPR-compliant account deletion: user data is hard-deleted, but their tickets/messages are anonymized rather than destroyed, preserving operational history for the other party (see [docs/schema.md](docs/schema.md#gdpr--account-deletion-behavior))
- Manual ticket creation, end to end: customers can create, list (paginated & sortable), view, close, and reopen their own tickets, and post/read messages on a ticket's thread — full UI at `/tickets`, `/tickets/new`, and `/tickets/:id`, backed by the API documented in [docs/api-endpoints.md](docs/api-endpoints.md#tickets-tickets)
- Redis-backed login rate limiting: 5 failed attempts per email+IP pair within 15 minutes returns a `429` with a real retry countdown, surfaced live in the login form — documented in [docs/api-endpoints.md](docs/api-endpoints.md#login-rate-limiting)

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
     ├── auth/         JWT issuance, refresh, guards, login rate limiting
     ├── tickets/       manual + AI-created tickets, shared validation
     ├── ai/             Gemini tool-calling, extracts structured tickets
     ├── common/        RateLimitService (Redis-backed primitives, reused by ai/ and auth/), shared validators
     ├── redis/         ioredis connection, consumed by common/
     └── users/
     │
     ├──► PostgreSQL (Neon)
     └──► Redis (Upstash)
```

Manual ticket submissions and AI-chat ticket submissions are two separate entry points that both call the same `TicketsService.create()` — see [docs/architecture.md](docs/architecture.md) for the full flow diagram.

`RateLimitService` (Redis-backed, `ioredis` over TCP) is shared across rate-limited surfaces with different policies: login (5 attempts/15 min, email+IP — done, Step 6) and AI chat (10 req/day/user — Step 9). Registration uses Cloudflare Turnstile instead of a counter, since CAPTCHA fits a one-shot signup better (Step 7). See [Roadmap](#roadmap).

Redis is accessed over a plain TCP connection via `ioredis` rather than Upstash's REST client, so the same connection code works unchanged against the local Docker Redis container and against Upstash in production — just a different `REDIS_URL`.

## Getting started

```bash
git clone https://github.com/Molnar-Zoltan/it-helpdesk.git
cd it-helpdesk
npm install

cp backend/.env.example backend/.env
# fill in DATABASE_URL, JWT secrets, GEMINI_API_KEY, REDIS_URL

cp frontend/.env.example frontend/.env
# defaults to BACKEND_API_URL=http://localhost:3001, fine for local dev

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

`frontend/.env.example` has one variable so far:

| Variable | Purpose |
|---|---|
| `BACKEND_API_URL` | NestJS origin, e.g. `http://localhost:3001`. **Server-only** — deliberately not `NEXT_PUBLIC_`, since the browser never calls the backend directly, only this app's own `/api/auth/*` and `/api/backend/*` route handlers do (see [architecture.md](docs/architecture.md#frontend-api-layer--auth-state)). |

It'll pick up more (e.g. a public Turnstile site key, `NEXT_PUBLIC_`-prefixed) once Step 7 lands.

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
5. ✅ Frontend — Next.js UI for auth + ticket creation/viewing
   - 5.1 ✅ App shell & design system — UI primitives (Button/Input/TextArea/FormField/Card/Badge/Alert/Spinner), Header/Footer, Tailwind v4 design tokens, `Providers` (TanStack Query) wired into the root layout
   - 5.2 ✅ API client & auth state — BFF proxy pattern: `/api/auth/{register,login,logout,refresh}` route handlers own the httpOnly `hd_access_token`/`hd_refresh_token` cookies (never exposed to client JS), and a catch-all `/api/backend/[...path]` proxy injects the Bearer token server-side for everything else, transparently refreshing and retrying once on a `401`. Browser-side `apiClient` (`lib/api/client.ts`) always calls this app's own `/api/backend/*`, never the NestJS origin directly. `useProfile()` (`lib/queries/use-profile.ts`) is the single source of auth state — no separate auth context. `ACCESS_TOKEN_TTL_MS`/`REFRESH_TOKEN_TTL_MS` promoted from backend-only constants into `@helpdesk/shared` so cookie `maxAge` can't drift from real token lifetime.
   - 5.3 ✅ Auth pages — `/login` and `/register`, `react-hook-form` + `zod` (`lib/validation/auth-schemas.ts`, wrapping `@helpdesk/shared`'s `isValidName`/`isStrongPassword`/`containsEmoji`/length constants so client rules can't drift from the backend DTOs). Register handles the backend's `422 WEAK_PASSWORD_WARNING` (HIBP soft-check) inline: a warning `Alert` with a "use this password anyway" button resubmits with `acknowledgeWeakPassword: true`, rather than blocking with a modal; editing the password afterward clears the warning. Register also validates firstName/lastName/email on blur then live (`mode: "onTouched"`), while password and confirm-password validate live from the first keystroke — the password field drives a live, per-criterion requirements checklist (`PasswordRequirements`, built on granular checks newly exported from `@helpdesk/shared`'s `validation/password.ts`) instead of a single pass/fail message. Both password fields use a new `PasswordInput` (`components/ui/`) with a show/hide toggle. Create-account intentionally stays enabled regardless of password strength — the checklist and submit-time errors already explain what's wrong, so disabling would only hide information. `proxy.ts` (Next 16's renamed `middleware.ts`) redirects an already-authenticated visitor away from `/login`/`/register`, scaffolded with an empty `PROTECTED_ROUTE_PREFIXES` list for 5.4 to extend. `Header` reads `useProfile()`/`useLogout()` for real — logged in shows Tickets plus a `UserMenu` dropdown (user icon → "Signed in as {firstName}", Account, Log out), logged out shows Log in/Sign up. Home page gained an `AuthStatusBanner` client component. `backendFetch` now converts a genuinely unreachable backend into a normal `503` response instead of an uncaught rejection, so register/login show a real "Unable to reach the server" message instead of crashing on `res.json()`. `sonner` added for toast notifications (themed via CSS variables onto the app's own design tokens, not its default richColors) — a green/accent-done success toast on registration, a neutral "Welcome back!" toast on login.
   - 5.4 ✅ Account pages — `/account`, protected by `proxy.ts`, with a tabbed layout (Name / Email / Password / Delete account) synced to a `?tab=` search param. Name tab does a plain `PATCH /users/me`. Password and Email tabs both require `currentPassword` re-verification, reuse the `PasswordRequirements` checklist and `WEAK_PASSWORD_WARNING` soft-confirm flow from register, and revoke every other active session on success (copy is explicit that this happens "the next time they try to refresh," not instantly, since revocation is checked on token refresh rather than on every request — an instant, live revocation check is deferred until the Redis work in Step 6 lands). Delete account sits behind a confirmation `Modal` (new UI primitive, with a focus trap and Escape/backdrop close) and calls `authClient.logout()` before `DELETE /users/me` so cookies are cleared immediately rather than on next refresh. All four tabs disable their mutating controls and show a `DemoAccountNotice` for the three seeded demo accounts, checked via `isDemoUserId` from `@helpdesk/shared` — mirrored on the backend by `UsersService.assertNotDemoAccount()`, which 403s the same four endpoints server-side so the guard can't be bypassed by calling the API directly.
   - 5.5 ✅ Ticket creation — `/tickets/new`, `NewTicketForm` (title `Input`, description `TextArea` with a live char count, priority `Select` defaulting `MEDIUM`), a new `Select` UI primitive (native `<select>` styled to match `Input`/`TextArea`), `useCreateTicket` mutation hook, `/tickets` added to `proxy.ts`'s protected routes. Deliberately **not** demo-account-restricted — `isDemoUserId` only gates the four account self-service mutations, not core ticket filing.
   - 5.6 ✅ Ticket list — `/tickets`, `useTickets` (paginated & sortable, `page`/`sortBy`/`sortOrder` synced to the URL, `keepPreviousData` for flicker-free paging), `StatusBadge`/`PriorityBadge`, `TicketRow`/`TicketPagination`/`TicketSortControls`. `PaginatedResult<T>` and the pagination/sort constants promoted from backend-only into `@helpdesk/shared`, mirroring the earlier `ACCESS_TOKEN_TTL_MS` precedent. `useCreateTicket` now invalidates the list on success.
   - 5.7 ✅ Ticket detail — `/tickets/:id`, `TicketDetailView` (header, description, close/reopen via a shared `TicketStatusModal`, `MessageThread` + `MessageComposer`). Backend gained a `400 TICKET_CLOSED_CANNOT_MESSAGE` guard blocking new messages on a `CLOSED` ticket (reading the thread is unaffected); the composer disables itself with an explanatory note to match. `TicketRow` now links here and the creation form redirects straight to the new ticket instead of the interim inline notice.
   - 5.8 ✅ Docs pass — README, `api-endpoints.md`, `architecture.md` updated for Steps 5.5–5.7 (ticket-frontend architecture section, `TICKET_CLOSED_CANNOT_MESSAGE` error documented on `POST /tickets/:id/messages`).
6. ✅ Redis login rate limiting (5 attempts / 15 min)
   - 6.1 ✅ Backend — `RateLimitService` (`common/services/`) exposes generic Redis primitives (`isLimited`/`recordFailure`/`reset`) over an `ioredis` TCP connection (new `redis/` module), rather than one monolithic guard — `LoginRateLimitGuard` pre-checks the limit before the request reaches `AuthController`, and `AuthService.login` records a failure only on bad credentials and resets the counter on success, so an early typo doesn't cost the rest of the 15-minute window once the password's right. Keyed on email+IP together (`ratelimit:login:{emailHash}:{ipHash}`, both hashed so raw values never sit in Redis) via a shared key-builder util so the guard and service can't drift onto different keys. A `429 LOGIN_RATE_LIMITED` response includes `retryAfterSeconds` read straight off the Redis key's TTL. Required a prerequisite fix: the frontend's BFF talks to the backend server-to-server, so without forwarding the browser's real IP every login would key on the frontend server's own address — `main.ts` now sets `trust proxy` (Cloud Run's Google Front End is the one trusted hop) and `/api/auth/login`'s route handler forwards `x-forwarded-for` explicitly. Also removed the never-used `IpUsage` Postgres model, scaffolded early for a Postgres-backed version of this that Redis superseded.
   - 6.2 ✅ Frontend — `LoginForm` reads `retryAfterSeconds` off `ApiError` (now carries it through both `apiClient`'s and `authClient`'s error paths) and ticks down a live countdown (`"Too many login attempts. Try again in 2:05."`), disabling submission until it clears — a static "try again later" would've left the user guessing.

**Left**

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
