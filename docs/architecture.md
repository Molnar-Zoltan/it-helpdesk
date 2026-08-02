# Architecture

## Ticket creation flow

Two entry points, one shared contract:

- **Manual form** — `POST /tickets` on the Next.js UI, validated with a Nest DTO, straight into `TicketsService.create()`.
- **AI chat** — the user chats with the assistant (Gemini, tool/function calling). Once enough detail has been gathered, the model calls a `create_ticket` tool with a structured payload. The backend intercepts that call, runs it through the **same** DTO and validation rules as the manual path, and calls the same `TicketsService.create()`.

Neither path can produce a ticket the other one wouldn't allow — the AI is a second producer, not a second contract.

The AI conversation itself is stored as `Message` rows on the resulting ticket (`type: AI`), so agents can see the original exchange without a separate conversation table.

## Backend module structure

```text
backend/src/
  auth/
  users/
  tickets/

backend/prisma/
  prisma.module.ts
  prisma.service.ts
```

- `backend/src/auth/` — owns authentication and JWT-based identity handling for register/login/refresh/logout flows; main files: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `dto/login.dto.ts`, `dto/register.dto.ts`, `guards/jwt-auth.guard.ts`, `guards/roles.guard.ts` (role-based route restriction via `@Roles()`, built but not yet applied to any endpoint — no current route needs more than authentication), `strategies/jwt.strategy.ts`, `token.util.ts`.
- `backend/src/users/` — owns authenticated self-service account actions for the signed-in user; main files: `users.controller.ts`, `users.service.ts`, `users.module.ts`, `dto/change-email.dto.ts`, `dto/change-password.dto.ts`, `dto/delete-account.dto.ts`, `dto/update-name.dto.ts`, `types/authenticated-request.type.ts`.
- `backend/src/tickets/` — manual ticket creation and self-service ticket management for customers; main files: `tickets.controller.ts`, `tickets.service.ts`, `tickets.module.ts`, `dto/create-ticket.dto.ts`, `dto/find-tickets-query.dto.ts`, `dto/close-ticket.dto.ts`, `dto/reopen-ticket.dto.ts`, `dto/create-message.dto.ts`. See [Manual ticket creation](#manual-ticket-creation) below for the design decisions behind it.
- `backend/prisma/` — shared persistence wiring for Prisma access and database setup; main files: `prisma.service.ts`, `prisma.module.ts`, `schema.prisma`, `seed.ts`.

No `ai/` or `rate-limit/` modules are implemented yet, so those responsibilities are still centralized rather than split into dedicated Nest modules.

## Manual ticket creation

`TicketsController`/`TicketsService` cover the customer-facing half of the ticket lifecycle — creation, listing, viewing, closing, reopening, and messaging. See [api-endpoints.md](api-endpoints.md#tickets-tickets) for the full endpoint reference. A few decisions worth calling out:

- **Ownership is enforced by scoping every query to `req.user.userId`, not by checking a fetched record after the fact.** `findAllForUser`/`findOneForUser` filter `where: { customerId }` directly, so there's no window where a ticket belonging to someone else is loaded and then rejected.
- **404, not 403, on inaccessible tickets.** A customer requesting another customer's ticket, or an unauthenticated/wrong-role request, gets the same "not found" response as a genuinely nonexistent ID — this avoids leaking which ticket IDs exist to someone who isn't the owner.
- **Pagination and sorting live in one shared, private helper.** `TicketsService.paginateTickets(where, query)` runs the `findMany` + `count` pair in a single Prisma `$transaction`, called today only with `{ customerId }` from `findAllForUser`. It's deliberately structured to accept an arbitrary `where` clause so Step 8's agent queue (unscoped, or filtered by `agentId`/`status`) can reuse it without touching the pagination/sort logic.
- **Close and reopen are narrow, single-purpose endpoints, not a general status-update route.** `PATCH /tickets/:id/close` only ever moves a ticket toward `CLOSED`; `PATCH /tickets/:id/reopen` only ever moves a `CLOSED` ticket back to `OPEN`. Broader agent-driven status transitions (e.g. `IN_PROGRESS` → `RESOLVED`) are left for Step 8, once an agent can actually be assigned to a ticket.
- **Message visibility is currently role-based, not assignment-based.** `TicketsService.assertCanAccessMessages` allows the owning customer or *any* `AGENT`/`ADMIN` to read and post messages on a ticket, because `agentId` is always `null` until Step 8 introduces assignment. Once assignment exists, this should narrow to "the assigned agent (or an unassigned ticket) plus `ADMIN`" — flagged in code and tracked as a Step 8 follow-up.
- **Close/reopen reasons are single-snapshot fields, not a history table.** `closeReason`/`closedAt`/`closedBy` and `reopenReason`/`reopenedAt`/`reopenedBy` are plain nullable columns on `Ticket`, overwritten on each repeat close/reopen cycle rather than preserving every prior transition. A dedicated `TicketStatusChange` table is a possible future upgrade if that cycling turns out to matter in practice — not scheduled.

## Validation

Field-level rules — length bounds, character sets, password strength, common-password rejection — live in `packages/shared/src/validation/`, not in the backend alone. Each rule is a plain function and/or a small set of named constants (`PASSWORD_MIN_LENGTH`, `NAME_MAX_LENGTH`, `TICKET_TITLE_MAX_LENGTH`, etc.) with no framework dependency, so either side of the monorepo can import them.

The backend wraps these in custom `class-validator` decorators (`backend/src/common/validators/` — `IsStrongPassword`, `IsValidName`, `NoEmoji`) and pairs them with `@Length()`/`@MaxLength()` calls that reference the *same* shared constants, so a length limit can't drift between the decorator and the underlying check.

The frontend doesn't consume these yet (frontend work is Step 5), but the intent is for form inputs to import the same constants directly — e.g. `maxLength={NAME_MAX_LENGTH}` — so client-side hints and server-side enforcement can never fall out of sync.

Email *format* validation is the one deliberate exception: it stays backend-only via `class-validator`'s `IsEmail` (built on `validator.js`) rather than being duplicated as a shared regex, since a hand-rolled pattern would risk drifting from the real check. Only `EMAIL_MAX_LENGTH` (254, per RFC 5321 §4.5.3.1.3) is shared.

See [api-endpoints.md](api-endpoints.md#validation-rules) for the concrete per-field bounds.

## Rate limiting

One `RateLimitGuard`, backed by Redis (Upstash REST — no persistent connection needed, which matters since the backend on Google Cloud Run can scale to zero), is reused across three surfaces with different policies:

| Surface | Policy | Key |
|---|---|---|
| AI chat | 10 requests / day / user | `ratelimit:ai:{userId}:{date}` |
| Login | 5 attempts / 15 min | `ratelimit:login:{emailHash}:{ipHash}` |
| Registration | Cloudflare Turnstile CAPTCHA | n/a — one-shot verification, not a counter |

Login is keyed on **email + IP together**, not either alone: IP-only would let one bad actor lock out everyone behind the same NAT, and email-only would let someone hammer a single account from many IPs without ever tripping a per-IP limit.

Registration uses Turnstile instead of a request counter because signup is a one-shot action — a counter can't distinguish a bot spinning up new accounts from a genuine user who mistyped something on a first try, whereas a CAPTCHA challenge can.

## Account self-service & deletion (GDPR)

`UsersController` (distinct from `AuthController`) owns everything a logged-in user does to their own record:

| Endpoint | `currentPassword` required? | Revokes refresh tokens? |
|---|---|---|
| `GET /users/me` | — | — |
| `PATCH /users/me` (firstName/lastName) | No | No |
| `PATCH /users/me/password` | Yes | Yes, all except current session |
| `PATCH /users/me/email` | Yes | Yes, all except current session |
| `DELETE /users/me` | Yes | Yes, all (cascade) |

The split from `AuthController` is deliberate: `AuthController` covers unauthenticated-adjacent flows (register/login/refresh/logout), while `UsersController` covers actions that require an already-authenticated identity and act on that identity's own record.

Password, email, and deletion all require `currentPassword` re-verification and revoke sessions — a compromised access token shouldn't be able to silently take over recovery paths. Name change requires neither, since it isn't a security-sensitive field.

**Deletion doesn't cascade-delete tickets or messages.** GDPR's right to erasure (Article 17) doesn't override the need to preserve operational records — an agent's resolution history and reporting metrics shouldn't disappear because a customer deleted their account. Instead, deletion anonymizes: the departing user's message content is replaced with a placeholder, then the `User` row is deleted, with `Ticket.customerId`/`agentId` and `Message.senderId` set to `null` via `onDelete: SetNull` (see `schema.md` for the full FK behavior table). `RefreshToken` rows are hard-deleted via cascade, since they carry no data worth preserving.

**All four mutations above are also blocked outright on the three seeded demo accounts**, via a private `UsersService.assertNotDemoAccount()` guard checked before password re-verification. The demo login credentials are published in the README for the live demo, so without this, any visitor could rename, relock, or delete a shared account every other visitor depends on. The guard checks the caller's `userId` against `DEMO_USER_IDS` from `@helpdesk/shared` — the same fixture `seed.ts` seeds from — rather than a DB column or an ID-naming convention, so the frontend can later reuse the identical `isDemoUserId()` check without a round-trip. See [api-endpoints.md](api-endpoints.md#demo-account-protection) for the per-endpoint error responses.

## Frontend API layer & auth state

The browser never talks to the NestJS backend directly, and never holds a raw JWT in anything JS-accessible. Next.js Route Handlers sit in between as a BFF (backend-for-frontend) layer:

```text
frontend/app/api/
  auth/
    register/route.ts
    login/route.ts
    logout/route.ts
    refresh/route.ts
  backend/
    [...path]/route.ts

frontend/lib/
  server/
    auth-cookies.ts        # cookie names, set/clear/get helpers
    backend-client.ts       # backendFetch(), refreshTokens()
    auth-route-helpers.ts   # shared login/register response handling
  api/
    client.ts                # browser-side apiClient (-> /api/backend/*)
    auth-client.ts            # browser-side authClient (-> /api/auth/*)
    types.ts                    # UserProfile, RegisterPayload, LoginPayload
  queries/
    use-profile.ts
  mutations/
    use-login.ts
    use-register.ts
    use-logout.ts
```

- **Two httpOnly cookies, `hd_access_token` and `hd_refresh_token`, are the only place a token lives in the browser.** They're set by `/api/auth/register` and `/api/auth/login` after a successful backend call, never echoed into a JSON response body. `secure` is gated on `NODE_ENV === 'production'` so cookies still get set over plain `http://localhost` in dev — a `Secure` cookie is silently dropped by the browser on a non-TLS origin.
- **`/api/backend/[...path]` is a catch-all proxy for everything authenticated except the four `/api/auth/*` actions above** (`GET /users/me` today; tickets endpoints once Step 5.5+ lands). It reads the access token cookie, forwards the request to the backend with `Authorization: Bearer <token>` injected server-side, and forwards the backend's response body/status back unchanged.
- **Refresh is transparent to the browser, and bounded to one retry.** If the access token cookie is missing entirely, the proxy refreshes proactively before making a request it already knows would `401`. If a request that *did* have an access token still gets a `401` back (expired between requests), the proxy refreshes once and retries the original request once. A second `401` after a fresh token is treated as a genuinely dead session — revoked or tampered — and passed through rather than retried further.
- **One `refreshTokens()` function, not an HTTP call to `/api/auth/refresh`.** Both the client-triggered `/api/auth/refresh` route and the proxy's internal retry logic call the same plain function in `lib/server/backend-client.ts`, so the internal case doesn't cost a self-fetch round trip.
- **`ACCESS_TOKEN_TTL_MS`/`REFRESH_TOKEN_TTL_MS` moved from backend-only constants into `@helpdesk/shared`.** Cookie `maxAge` mirrors real token lifetime; keeping the numbers backend-only would have meant duplicating them in the frontend with the same drift risk this project already hit once with `REFRESH_TOKEN_TTL_MS`. The backend remains authoritative for actual authorization — every request is still verified against the JWT signature/exp server-side regardless of what a cookie's `maxAge` says.
- **Auth state has no separate context or store.** `useProfile()` (`lib/queries/use-profile.ts`) wraps `GET /users/me` in a TanStack Query hook with `retry: false`; its three states *are* the auth state — `isLoading` (unknown yet), `isError` (logged out — the proxy's own refresh-and-retry already failed before this `401` surfaced), `data` (the current user). `useLogin`/`useRegister` invalidate this query on success; `useLogout` calls `queryClient.clear()` to drop *all* cached data, not just the profile, so a logged-out session can't hold onto another user's data in memory.
- **`apiClient` (browser) vs `authClient` (browser) vs `backendFetch` (server-only).** `apiClient.get/post/patch/delete` always target `/api/backend/*` and are what every future query/mutation hook (tickets, account pages) will use. `authClient` is a small separate wrapper for the three `/api/auth/*` actions, since those aren't authenticated pass-throughs — the route handlers do real work (setting/clearing cookies) rather than just forwarding. `backendFetch` is the one place that actually knows `BACKEND_API_URL`; it only runs inside route handlers, marked with the `server-only` package so an accidental client-side import fails at build time instead of leaking the backend origin into a browser bundle.
- **Nest's default error shape is normalized once, not per call site.** `{ statusCode, message, error }` — where `message` is a `string[]` for class-validator failures — becomes a single `ApiError` with a joined string message and an optional `code` (Nest's `error` field). `code` matters for at least one real case: `WeakPasswordException` (422, `WEAK_PASSWORD_WARNING`) is a *confirmable* warning, not a hard failure — see the "Auth pages" section below for how the register form uses it.

## Auth pages (Step 5.3)

```
frontend/app/
  login/
    page.tsx
    _components/login-form/
  register/
    page.tsx
    _components/register-form/
  _components/
    auth-status-banner/       # home page only

frontend/lib/validation/
  auth-schemas.ts              # zod, wraps @helpdesk/shared

frontend/proxy.ts
```

- **`proxy.ts` is Next 16's renamed `middleware.ts`** (confirmed via the actual `node_modules` docs for this project's Next version — a real breaking change from older Next knowledge, not a typo). It redirects an already-authenticated visitor away from `/login`/`/register` back to `/`, based on presence of the `hd_access_token` cookie only — no JWT verification happens here. This is a UX redirect, not the real authorization boundary: the backend still verifies every request's JWT server-side regardless of what this does. It's scaffolded with an empty `PROTECTED_ROUTE_PREFIXES` array and the redirect-to-login branch already wired up, so Step 5.4's account pages just add a prefix (and a matcher entry) instead of restructuring the file.
- **`lib/validation/auth-schemas.ts` wraps `@helpdesk/shared`'s validation functions/constants** (`isValidName`, `isStrongPassword`, `containsEmoji`, the `*_MIN/MAX_LENGTH` constants) rather than re-implementing rules in zod from scratch, so the frontend can't drift from what `register.dto.ts` actually enforces. Email *format* validity is deliberately not duplicated (see `packages/shared/src/validation/email.ts`) — only the shared length cap plus zod's own format check are applied client-side, with the backend's `400` as the authoritative answer. `registerSchema` adds a `confirmPassword` field that exists only in the zod shape (cross-field `refine`) and is stripped before the payload is sent — the backend has no concept of it.
- **The `WEAK_PASSWORD_WARNING` flow is handled inline, not with a modal.** On a `422` with `code === 'WEAK_PASSWORD_WARNING'`, the register form sets local state and renders a warning `Alert` with a "use this password anyway" button that resubmits the same form values plus `acknowledgeWeakPassword: true`. Editing the password field afterward clears the warning — an acknowledgement shouldn't silently carry over to a different password the user typed next.
- **`Header` is now `useProfile()`/`useLogout()`-driven**, replacing the 5.1 static "Log in" placeholder. Tickets/Account links and a name + Log out control render only when there's a session; Log in/Sign up render only when there isn't. Tickets/Account are hidden rather than shown-and-left-to-404 for logged-out visitors, since both routes will require auth once built.
- **Post-login/register redirect target is `/`,** not a dedicated dashboard — there's no ticket list or account page yet (Steps 5.4/5.6). The home page's `AuthStatusBanner` (a small client component, kept separate so `app/page.tsx` itself stays a server component) shows a login/register prompt when logged out or a "Welcome back" note when logged in, so landing on `/` after auth isn't a dead end. `proxy.ts` also supports a `?redirectTo=` query param for when a protected route eventually bounces someone to `/login` first.

## Deployment

```
Next.js  ──────────────►  Vercel
NestJS API ─────────────►  Google Cloud Run
PostgreSQL ─────────────►  Neon
Redis ──────────────────►  Upstash
```

Frontend and backend deploy independently; `packages/shared` provides the types both sides build against, so there's no runtime coupling — only a shared dev-time dependency.
