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
  redis/
  admin/

backend/prisma/
  prisma.module.ts
  prisma.service.ts
  seed.ts
  seed-demo-data.ts
```

- `backend/src/auth/` — owns authentication and JWT-based identity handling for register/login/refresh/logout flows; main files: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `dto/login.dto.ts`, `dto/register.dto.ts`, `guards/jwt-auth.guard.ts`, `guards/roles.guard.ts` (role-based route restriction via `@Roles()`, built but not yet applied to any endpoint — no current route needs more than authentication), `guards/login-rate-limit.guard.ts` (Step 6), `login-rate-limit.util.ts`, `exceptions/login-rate-limited.exception.ts`, `strategies/jwt.strategy.ts`, `token.util.ts`.
- `backend/src/users/` — owns authenticated self-service account actions for the signed-in user; main files: `users.controller.ts`, `users.service.ts`, `users.module.ts`, `dto/change-email.dto.ts`, `dto/change-password.dto.ts`, `dto/delete-account.dto.ts`, `dto/update-name.dto.ts`, `types/authenticated-request.type.ts`.
- `backend/src/tickets/` — manual ticket creation and self-service ticket management for customers, plus agent-facing assignment/status/queue routes (Step 9); main files: `tickets.controller.ts`, `tickets.service.ts`, `tickets.module.ts`, `dto/create-ticket.dto.ts`, `dto/find-tickets-query.dto.ts`, `dto/close-ticket.dto.ts`, `dto/reopen-ticket.dto.ts`, `dto/create-message.dto.ts`, `dto/assign-ticket.dto.ts`, `dto/update-ticket-status.dto.ts`, `dto/find-ticket-queue.dto.ts`, `guards/ticket-create-rate-limit.guard.ts`, `guards/ticket-message-rate-limit.guard.ts` (Step 6), `exceptions/ticket-create-rate-limited.exception.ts`, `exceptions/ticket-message-rate-limited.exception.ts`. See [Manual ticket creation](#manual-ticket-creation) and [Agent dashboard](#agent-dashboard-step-9) below for the design decisions behind it.
- `backend/src/redis/` — global module wrapping a single `ioredis` client (`REDIS_URL`); main files: `redis.module.ts`, `redis.service.ts`. Consumed by `common/services/rate-limit.service.ts` (see [Rate limiting](#rate-limiting) below), not called directly by feature modules.
- `backend/src/admin/` (Step 8.5) — operational actions with no user-facing login, gated by a shared secret instead of a JWT; main files: `admin.controller.ts`, `admin.service.ts`, `admin.module.ts`, `guards/demo-reset.guard.ts`. See [Demo reset](#demo-reset-step-85) below.
- `backend/prisma/` — shared persistence wiring for Prisma access and database setup; main files: `prisma.service.ts`, `prisma.module.ts`, `schema.prisma`, `seed.ts`, `seed-demo-data.ts` (Step 8.5 — the insert logic extracted out of `seed.ts` so `AdminService.resetDemoData()` can reuse it; see [Demo reset](#demo-reset-step-85)).

No `ai/` module is implemented yet, so AI-related responsibilities (Step 10) are still centralized rather than split into a dedicated Nest module.

## Agent dashboard (Step 9)

Agents and admins gained assignment, agent-driven status transitions, and a browsable queue on top of the customer-facing ticket lifecycle from Step 4. No schema migration was needed — assignment and status transitions reuse the `agentId`/`status` columns that already existed on `Ticket`.

```
backend/src/tickets/
  dto/assign-ticket.dto.ts
  dto/update-ticket-status.dto.ts
  dto/find-ticket-queue.dto.ts

frontend/app/tickets/
  queue/
    page.tsx
    _components/
      ticket-queue-view/     # mirrors ticket-list-view, adds currentUserId to TicketRow
      ticket-queue-filters/
  [id]/_components/
    ticket-agent-controls/   # role-gated assign + status-transition panel

frontend/lib/
  mutations/
    use-assign-ticket.ts
    use-update-ticket-status.ts
  queries/
    use-ticket-queue.ts
```

- **`PATCH /tickets/:id/assign` — self-assign for any agent, reassign for admins only.** Any `AGENT` can claim an unassigned ticket; only `ADMIN` can assign a ticket that already has an agent, or assign to someone other than themselves (`AssignTicketDto.targetAgentId` defaults to the caller if omitted, so the same endpoint serves both self-assign and admin-reassign without an agent-picker UI on the frontend). A repeat self-assign to the same agent is a true no-op — the write is skipped entirely, not just re-run with identical values — because Prisma's `@updatedAt` fires on every write regardless of whether anything actually changed, and without this check an agent could silently bump their own ticket's `updatedAt` and climb a recency-sorted queue for free. Permission failures are `403`, not `404` — unlike the customer-facing ticket routes, ticket existence isn't a secret from agents/admins, since they can already see it in the queue.
- **`PATCH /tickets/:id/status` — an explicit transition map, not a free-form status write.** `TicketsService.ALLOWED_AGENT_STATUS_TRANSITIONS` enumerates exactly which statuses each current status may move to: `OPEN ↔ IN_PROGRESS ↔ RESOLVED`, plus any of those three → `CLOSED` (reusing the same `closeReason`/`closedAt`/`closedBy` columns a customer-initiated close writes, with a required `reason` validated the same way). Self-transitions are deliberately absent from the map, so a repeat call with the same target status `400`s instead of silently rewriting the row — same no-op-guarding instinct as the assign endpoint, enforced by the map's shape instead of an extra check. `CLOSED` has no outgoing transitions here: reopening stays customer-only, via the existing `PATCH /tickets/:id/reopen`. Permission is the assigned agent or `ADMIN`; an unassigned ticket is `ADMIN`-only, since there's no "assigned agent" to authorize yet.
- **`GET /tickets/queue` reuses `paginateTickets(where, query)`**, the same private helper `findAllForUser` has called since Step 4.1.4 — it was deliberately structured to accept an arbitrary `where` clause for exactly this reuse. `FindTicketQueueDto` layers optional `status`/`priority`/`assignedTo` (`me` | `unassigned` | a literal agent id) filters on top of the existing `page`/`limit`/`sortBy`/`sortOrder`. Registered before `:id` in the controller, since Nest/Express match routes by declaration order and `queue` would otherwise be swallowed by the `:id` param route.
- **`canAccessTicket(ticket, callerId, role)` is one shared visibility rule** behind both `findOneForUser` and `assertCanAccessMessages`: the owning customer; the ticket's assigned agent, or *any* agent while it's still unassigned (so an agent can open an unclaimed ticket to decide whether to take it); or `ADMIN` unconditionally. This replaced the earlier "any `AGENT`/`ADMIN`" rule both methods used from Step 9.1 through the `GET /tickets/:id` follow-up fix — now that assignment (9.1) and a queue to claim from (9.3) both exist, an agent peeking into a ticket assigned to someone else no longer has a reason to. `findQueue` deliberately does **not** go through `canAccessTicket` — it's a browsing/index view an agent needs to see broadly (including other agents' tickets) to make sense of the board, so narrowing it the same way as a single ticket's detail would make it useless for its actual purpose.
- **`POST /tickets` is now `@Roles(Role.CUSTOMER)`-guarded**, where previously any authenticated role could file a ticket as themselves. The frontend mirrors this: the Tickets nav link, `/tickets`, and `/tickets/new` are all customer-only via the same client-side `useProfile()` role check the queue already used in the other direction, showing a friendly in-page message instead of a dead end for an agent/admin who navigates there directly. This is a deliberate simplification, not necessarily the most production-realistic pattern — real helpdesk products commonly let an agent file a ticket *on behalf of* a customer (assisted/proxy creation with a customer picker) rather than blocking the role outright. Adding that back is a real feature (a conditionally-settable `customerId` on `CreateTicketDto`, restricted to `AGENT`/`ADMIN`, plus a customer search UI), not a small tweak — noted as a possible future item, not scheduled.
- **Reopen resumes `IN_PROGRESS` if the ticket still has an agent (Step 9.5).** A closed ticket keeps whatever `agentId` it had at close time — closing doesn't unassign — so if that agent is still attached, `PATCH /tickets/:id/reopen` now puts the ticket back in `IN_PROGRESS` rather than dropping it to an unclaimed-looking `OPEN` the assigned agent would need to notice and re-transition themselves. An unassigned ticket still reopens to `OPEN`, same as before — there's no one to resume "in progress" work for.
- **Message sender identity now respects both role and viewer.** `toMessageResponse` joins `sender.firstName`/`lastName` into a `senderName` field on every message (`null` exactly when `senderId` is `null` — AI-generated or the sender's account was since GDPR-anonymized, consistent with existing null-sender handling), replacing an earlier assumption in the frontend's `MessageThread` that the detail page was only ever reachable by its owning customer. The viewer's role also changes *how much* name they see: a `CUSTOMER` viewer gets only an agent's first name (matching the Zendesk/Freshdesk convention of not exposing an agent's full name to end users), while an `AGENT`/`ADMIN` viewer gets full names for anyone on the ticket, needed to unambiguously identify the customer or a fellow agent. A ticket only ever has one customer, so this never truncates the customer's own name regardless of viewer.
- **`TicketAgentControls` (frontend) is gated to `AGENT`/`ADMIN` via `useProfile()`**, mirroring the backend's own permission checks rather than trusting the backend alone to hide the UI. Its status-transition options come from a small client-side copy of `ALLOWED_AGENT_STATUS_TRANSITIONS`, commented as hand-synced — display-only, so it's nothing more than avoiding an offer the backend would reject, and there's nothing in `@helpdesk/shared` to import it from since the map is a private service detail, not a cross-cutting validation rule. **Keep this copy updated by hand if the backend map ever changes.** The reassign button posts an empty body so `AssignTicketDto.targetAgentId` falls back to the caller server-side, avoiding an agent-picker UI entirely.
- **`TicketRow` blocks navigation into another agent's assigned ticket** (`preventDefault` + a toast) when an `AGENT` — not `ADMIN`, who can open anything per `canAccessTicket` — clicks a queue row assigned to someone else, rather than letting it 404 through to a generic "not found" panel. Purely a client-side UX guard; it doesn't reveal anything the queue's own "Assigned" badge hadn't already shown. The toast uses `sonner`'s `id` option with a shared module-level constant to dedupe repeat clicks in place, rather than stacking a new toast per click — the general pattern for any future repeat-click-spam toast issue in this codebase.

## Manual ticket creation

`TicketsController`/`TicketsService` cover the customer-facing half of the ticket lifecycle — creation, listing, viewing, closing, reopening, and messaging. See [api-endpoints.md](api-endpoints.md#tickets-tickets) for the full endpoint reference. A few decisions worth calling out:

- **Ownership is enforced by scoping every query to `req.user.userId`, not by checking a fetched record after the fact.** `findAllForUser`/`findOneForUser` filter `where: { customerId }` directly, so there's no window where a ticket belonging to someone else is loaded and then rejected.
- **404, not 403, on inaccessible tickets — for the customer-facing routes.** A customer requesting another customer's ticket gets the same "not found" response as a genuinely nonexistent ID, avoiding leaking which ticket IDs exist to someone who isn't the owner. The agent-facing assign/status routes (Step 9) invert this deliberately — see [Agent dashboard](#agent-dashboard-step-9) above for why.
- **Pagination and sorting live in one shared, private helper.** `TicketsService.paginateTickets(where, query)` runs the `findMany` + `count` pair in a single Prisma `$transaction`. `findAllForUser` calls it with `{ customerId }`; Step 9.3's agent queue (`findQueue`) reuses it unscoped or filtered by `agentId`/`status`/`priority` — exactly the reuse it was structured for back in Step 4.1.4.
- **Close and reopen stay narrow, single-purpose endpoints, not a general status-update route.** `PATCH /tickets/:id/close` only ever moves a ticket toward `CLOSED`; `PATCH /tickets/:id/reopen` only ever moves a `CLOSED` ticket back to `OPEN`/`IN_PROGRESS` (see Step 9.5 above). Broader agent-driven status transitions live on their own endpoint, `PATCH /tickets/:id/status` (Step 9.2), rather than being folded into either of these.
- **Message visibility is assignment-based, not just role-based, as of Step 9.4.** `assertCanAccessMessages` delegates to the shared `canAccessTicket` helper described above — narrowed from the original "any `AGENT`/`ADMIN`" rule now that assignment actually exists.
- **Close/reopen reasons are single-snapshot fields, not a history table.** `closeReason`/`closedAt`/`closedBy` and `reopenReason`/`reopenedAt`/`reopenedBy` are plain nullable columns on `Ticket`, overwritten on each repeat close/reopen cycle rather than preserving every prior transition. A dedicated `TicketStatusChange` table is a possible future upgrade if that cycling turns out to matter in practice — not scheduled.
- **Creation and messages carry an anti-spam cooldown, not just validation.** `TicketCreateRateLimitGuard` (60s) and `TicketMessageRateLimitGuard` (10s, per-ticket) sit in `tickets/guards/`, reusing the same `RateLimitService` primitives as login's rate limit — see [Rate limiting](#rate-limiting) below for why these needed a different counting shape than login's.

## Validation

Field-level rules — length bounds, character sets, password strength, common-password rejection — live in `packages/shared/src/validation/`, not in the backend alone. Each rule is a plain function and/or a small set of named constants (`PASSWORD_MIN_LENGTH`, `NAME_MAX_LENGTH`, `TICKET_TITLE_MAX_LENGTH`, etc.) with no framework dependency, so either side of the monorepo can import them.

The backend wraps these in custom `class-validator` decorators (`backend/src/common/validators/` — `IsStrongPassword`, `IsValidName`, `NoEmoji`) and pairs them with `@Length()`/`@MaxLength()` calls that reference the *same* shared constants, so a length limit can't drift between the decorator and the underlying check.

The frontend doesn't consume these yet (frontend work is Step 5), but the intent is for form inputs to import the same constants directly — e.g. `maxLength={NAME_MAX_LENGTH}` — so client-side hints and server-side enforcement can never fall out of sync.

Email *format* validation is the one deliberate exception: it stays backend-only via `class-validator`'s `IsEmail` (built on `validator.js`) rather than being duplicated as a shared regex, since a hand-rolled pattern would risk drifting from the real check. Only `EMAIL_MAX_LENGTH` (254, per RFC 5321 §4.5.3.1.3) is shared.

See [api-endpoints.md](api-endpoints.md#validation-rules) for the concrete per-field bounds.

## Rate limiting

`RateLimitService` (`backend/src/common/services/rate-limit.service.ts`), backed by Redis via `ioredis` over a plain TCP connection (not Upstash's REST client — see [Getting started](../README.md#getting-started); this is the same connection code unchanged against the local Docker Redis container and Upstash in production, just a different `REDIS_URL`), exposes generic primitives — `isLimited`, `increment`, `reset` — rather than one monolithic guard class. Each rate-limited surface gets its own thin guard/service wiring on top of the same primitives, so the counting semantics (what counts as an "attempt," when to reset) can differ per surface without duplicating the Redis logic itself:

| Surface | Policy | Key | Counts |
|---|---|---|---|
| Login (Step 6, done) | 5 attempts / 15 min | `ratelimit:login:{emailHash}:{ipHash}` | Failed attempts only — `AuthService.login` resets the counter on success, so an early typo doesn't cost the rest of the window once the password's right |
| Ticket creation (Step 6, done) | 1 per 60 sec | `ratelimit:ticket-create:{userId}` | Every attempt, regardless of outcome |
| Ticket messages (Step 6, done) | 1 per 10 sec, per ticket | `ratelimit:ticket-message:{userId}:{ticketId}` | Every attempt, regardless of outcome |
| AI chat (Step 10) | 25 requests / day / user | `ratelimit:ai:{userId}:{date}` | Every request, regardless of outcome — the cost is incurred either way |
| Registration (Step 7, done) | Cloudflare Turnstile CAPTCHA | n/a — one-shot verification, not a counter | — |

Login is keyed on **email + IP together**, not either alone: IP-only would let one bad actor lock out everyone behind the same NAT, and email-only would let someone hammer a single account from many IPs without ever tripping a per-IP limit. `LoginRateLimitGuard` only *checks* the limit (via `RateLimitService.isLimited`) before the request reaches `AuthService`; it's `AuthService.login` that calls `increment`/`reset` once it actually knows whether the attempt succeeded, since a guard's `canActivate` runs before the route handler and has no visibility into that outcome.

Both the guard and `AuthService` need to land on the identical Redis key for the same email+IP pair, so the key format itself lives in one place (`backend/src/auth/login-rate-limit.util.ts`) rather than two independently maintained string templates.

**Getting a real client IP required a prerequisite fix.** The frontend's BFF layer talks to the backend server-to-server (`backendFetch`), which never carries the browser's own connection — without intervention, every login through the actual website would be keyed on the frontend server's own IP, not the visitor's. `main.ts` sets `trust proxy` to `1` (Cloud Run's Google Front End is the one trusted hop, and it appends the real client IP after receipt, so it can't be spoofed by a direct caller), and the frontend's `/api/auth/login` route handler explicitly forwards the incoming request's `x-forwarded-for` header on the backend call.

**Ticket creation and messages are a different shape of problem — anti-spam, not brute-force protection.** The three seeded demo accounts' credentials are published in the README for the live demo, and registration is open with no CAPTCHA until Step 7, so either path is an easy way to flood the shared demo (or any account) with junk data. Because the cost here is incurred by the *attempt* itself, not by whether it succeeds, `TicketCreateRateLimitGuard` and `TicketMessageRateLimitGuard` are fully self-contained — they check and `increment` in the same pass, with no service-side success/failure bookkeeping needed (unlike login). Ticket creation gets a full 60-second cooldown, since filing more than one new ticket within a minute isn't something a real user does; messages get a much shorter 10 seconds, since a support thread is genuinely conversational and a longer cooldown would get in the way of a real back-and-forth. Messages are scoped per-ticket (not just per-user), so a cooldown on one thread doesn't block replying on another. See [api-endpoints.md#ticket-rate-limiting](api-endpoints.md#ticket-rate-limiting) for the exact error shape.

Registration uses Turnstile instead of a request counter because signup is a one-shot action — a counter can't distinguish a bot spinning up new accounts from a genuine user who mistyped something on a first try, whereas a CAPTCHA challenge can. `TurnstileGuard` (`backend/src/auth/guards/`) reads `turnstileToken` off the raw request body — same reason `LoginRateLimitGuard` reads `email` raw, guards run before the `ValidationPipe` — and verifies it via `TurnstileService` (`backend/src/common/services/turnstile.service.ts`) against Cloudflare's siteverify API.

**Turnstile fails closed, unlike the HIBP breach check.** `PwnedPasswordService`'s check is advisory (`WEAK_PASSWORD_WARNING` is a soft, confirmable warning), so it fails *open* if the HIBP API is unreachable — registration proceeds rather than blocking on an unrelated outage. Turnstile is the actual anti-bot gate, so `TurnstileService.verify()` deliberately fails *closed*: an unreachable, slow, or erroring siteverify call is treated the same as a failed verification, not let through. A brief Cloudflare outage blocking new signups is judged a smaller cost than silently having no bot protection during that window.

**Turnstile tokens are single-use.** A token consumed by one `POST /auth/register` call — successful or not — can't be reused on a second call, including a resubmit after `acknowledgeWeakPassword: true`. The frontend's `RegisterForm` accounts for this: any failed registration attempt resets its `TurnstileWidget` and clears the stored token, requiring a fresh one before either the primary submit or the weak-password "use this password anyway" resubmit can fire again.

**Local/sandbox dev uses Cloudflare's official "always passes" test keys** (`backend/.env.example`'s `TURNSTILE_SECRET_KEY`, `frontend/.env.example`'s `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) rather than a custom `NODE_ENV`-gated bypass — a real Cloudflare-provided testing mechanism, so there's no security-relevant shortcut in the codebase that could accidentally ship live. The secret key is backend-only; the site key is public by design (`NEXT_PUBLIC_`) and lives in the frontend's env only, since the backend never needs it.

## Demo reset (Step 8.5)

The three seeded demo accounts aren't blocked from creating, closing, reopening, or messaging tickets — only the four `/users/me` self-service mutations are (see [Account self-service & deletion](#account-self-service--deletion-gdpr) below). Left alone, ticket/message data (and any real signups from registration, which has no such restriction at all) would accumulate indefinitely on the public live demo. `POST /admin/demo-reset` wipes the whole database and re-seeds the demo fixture, called on a ~48-hour schedule by `.github/workflows/demo-reset.yml`.

**Auth is a shared secret, not a login.** The only intended caller is a scheduled GitHub Actions job, which has no user session to present — so `DemoResetGuard` (`backend/src/admin/guards/demo-reset.guard.ts`) checks a `x-admin-reset-secret` header against the `ADMIN_RESET_SECRET` env var directly, with no `JwtAuthGuard`/`RolesGuard` involved at all. This is deliberate: it means the demo `ADMIN` account's own access token grants no access to this endpoint either — role has no bearing here, only possession of the secret does. The comparison uses `crypto.timingSafeEqual` (length-checked first, since it throws on mismatched lengths) rather than `===`, for the same constant-time reasoning as the token-hash comparisons in `auth/`.

**Full wipe, not a diff against seed state.** Since demo accounts can generate real ticket/message data through normal use (and registration can create entirely new accounts), a partial reset that only touched "known seed rows" would leave that behind. `AdminService.resetDemoData()` deletes every row — `Message` → `Ticket` → `RefreshToken`/`AiUsage` → `User`, respecting FK direction — then re-seeds, all inside one `$transaction` so a caller never observes a half-empty database mid-reset.

**One insert path, not two.** The demo-fixture insert logic that used to live inline in `seed.ts` (Step 4.1.9) was extracted into `backend/prisma/seed-demo-data.ts`'s `seedDemoData()`, typed against `Prisma.TransactionClient` — the narrower of the two shapes a plain `PrismaClient` also satisfies. `seed.ts` (a fresh `prisma db seed`) and `AdminService.resetDemoData()` (an interactive-transaction client) both call the same function, so neither can drift into inserting slightly different demo state.

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
    _components/
      register-form/
      password-requirements/    # live per-criterion checklist
      turnstile-widget/         # Step 7.2 — Cloudflare CAPTCHA, register-only so far
  _components/
    auth-status-banner/       # home page only

frontend/lib/validation/
  auth-schemas.ts              # zod, wraps @helpdesk/shared

frontend/components/ui/
  password-input/              # show/hide toggle, used by both forms

frontend/components/layout/
  user-menu/                   # dropdown: Account, Log out

frontend/proxy.ts
```

- **`proxy.ts` is Next 16's renamed `middleware.ts`** (confirmed via the actual `node_modules` docs for this project's Next version — a real breaking change from older Next knowledge, not a typo). It redirects an already-authenticated visitor away from `/login`/`/register` back to `/`, based on presence of the `hd_access_token` cookie only — no JWT verification happens here. This is a UX redirect, not the real authorization boundary: the backend still verifies every request's JWT server-side regardless of what this does. It's scaffolded with an empty `PROTECTED_ROUTE_PREFIXES` array and the redirect-to-login branch already wired up, so Step 5.4's account pages just add a prefix (and a matcher entry) instead of restructuring the file.
- **`lib/validation/auth-schemas.ts` wraps `@helpdesk/shared`'s validation functions/constants** (`isValidName`, `isStrongPassword`, `containsEmoji`, the `*_MIN/MAX_LENGTH` constants) rather than re-implementing rules in zod from scratch, so the frontend can't drift from what `register.dto.ts` actually enforces. Email *format* validity is deliberately not duplicated (see `packages/shared/src/validation/email.ts`) — only the shared length cap plus zod's own format check are applied client-side, with the backend's `400` as the authoritative answer. `registerSchema` adds a `confirmPassword` field that exists only in the zod shape (cross-field `refine`) and is stripped before the payload is sent — the backend has no concept of it.
- **The `WEAK_PASSWORD_WARNING` flow is handled inline, not with a modal.** On a `422` with `code === 'WEAK_PASSWORD_WARNING'`, the register form sets local state and renders a warning `Alert` with a "use this password anyway" button that resubmits the same form values plus `acknowledgeWeakPassword: true`. Editing the password field afterward clears the warning — an acknowledgement shouldn't silently carry over to a different password the user typed next.
- **Register's fields validate at different times, deliberately.** firstName/lastName/email use `mode: "onTouched"` — validate once the field is first left, then live after that. Password and confirmPassword instead call `trigger()` manually inside their own `onChange` handlers, validating from the first keystroke — password to drive the live `PasswordRequirements` checklist, confirmPassword so a mismatch shows up immediately rather than waiting for blur or submit. `packages/shared/src/validation/password.ts` now exports the individual checks (`hasMinLength`/`hasUppercase`/`hasLowercase`/`hasDigit`/`hasSpecialChar`) alongside `isStrongPassword` (which just composes them) specifically so this checklist can't drift from what the backend enforces. Create-account intentionally stays enabled regardless of password strength — the checklist plus submit-time errors already explain what's wrong; a disabled button would only hide that information, not add any.
- **`PasswordInput` (`components/ui/`) wraps `Input` with a show/hide toggle**, built directly as a `ui/` primitive rather than starting in a route's `_components/` — both `/login` and `/register` need it immediately, and Step 5.4's account password-change will be a third consumer.
- **`TurnstileWidget` (Step 7.2, `register/_components/`) loads Cloudflare's script via `next/script`'s `onReady` callback, not `onLoad`.** `onLoad` only ever fires once per page load; `onReady` also fires on every mount, which matters for a per-instance widget if a visitor navigates back to `/register` client-side after the script already loaded once. It exposes a `reset()` handle via `forwardRef`/`useImperativeHandle` — see the Rate limiting section above for why `RegisterForm` needs to call it after every failed submission, not just Turnstile-specific failures. Not yet promoted to `components/ui/`, since register is its only consumer so far.
- **`Header`'s logged-in state is a `UserMenu` dropdown, not inline text.** A user-icon button opens a menu with a non-clickable "Signed in as {firstName}" label, Account, and Log out — closes on outside click, `Escape`, or picking an item. `firstName` previously sat directly in the nav next to Tickets, sharing its color/spacing, which made it read as a (non-functional) nav link; moving it into the dropdown as a label fixes that. Tickets stays as an ordinary top-level link, shown only when there's a session (hidden rather than shown-and-left-to-404 for logged-out visitors, since it'll require auth once built).
- **`backendFetch` (`lib/server/backend-client.ts`) turns a genuinely unreachable backend into a normal `503` Response**, not an uncaught rejection — `fetch()` itself rejects (not resolves with a 4xx/5xx) on connection-refused/DNS-failure, and nothing was catching that, so Next fell back to its own generic non-JSON `500` and `authClient.postAuth` crashed trying to `res.json()` it. Every caller (register/login route handlers, `refreshTokens`, the `/api/backend` proxy) now only ever handles a `Response` object. `refreshTokens` deliberately does *not* clear session cookies on this specific `503` — only on a real refresh rejection — so a transient outage can't silently log someone out of an otherwise-valid session.
- **Toast notifications use `sonner`**, mounted in `Providers` and styled via its CSS-variable API (`--normal-*`/`--success-*`) mapped onto this app's own `@theme` tokens rather than sonner's built-in `richColors` palette — toasts read as part of this app, not a generic library default. Register fires a green/`accent-done`-bordered `toast.success()` right before its redirect (survives the navigation since `Toaster` lives at the layout level); login fires a neutral `toast()` ("Welcome back!") using the same dark styling as everything else, not the success color, since it's a greeting rather than a confirmation.
- **Post-login/register redirect target is `/`,** not a dedicated dashboard — there's no ticket list or account page yet (Steps 5.4/5.6). The home page's `AuthStatusBanner` (a small client component, kept separate so `app/page.tsx` itself stays a server component) shows a login/register prompt when logged out or a "Welcome back" note when logged in, so landing on `/` after auth isn't a dead end. `proxy.ts` also supports a `?redirectTo=` query param for when a protected route eventually bounces someone to `/login` first.

## Ticket frontend (Steps 5.5–5.7)

```
frontend/app/tickets/
  page.tsx
  _components/
    ticket-list-view/       # reads/writes ?page=&sortBy=&sortOrder=
    ticket-row/              # NOT linked until 5.7 lands a detail page
    ticket-pagination/       # plain Prev/Next, no page-number strip
    ticket-sort-controls/
    status-badge/             # wraps the Badge primitive
    priority-badge/
  new/
    page.tsx
    _components/new-ticket-form/
  [id]/
    page.tsx                    # awaits Next 16's async params
    _components/
      ticket-detail-view/
      ticket-status-modal/      # shared by close AND reopen
      message-thread/
      message-item/
      message-composer/

frontend/lib/validation/
  ticket-schemas.ts   # zod, wraps @helpdesk/shared's TICKET_* constants

frontend/lib/queries/
  use-tickets.ts        # list, key: ["tickets", { page, limit, sortBy, sortOrder }]
  use-ticket.ts           # detail, key: ["tickets", "detail", id] — nested under
                           # the list's key so invalidating ["tickets"] catches both
  use-ticket-messages.ts

frontend/lib/mutations/
  use-create-ticket.ts
  use-close-ticket.ts
  use-reopen-ticket.ts
  use-create-message.ts

frontend/components/ui/select/   # native <select>, styled to match Input/TextArea
```

- **Manual ticket creation is intentionally *not* gated by `isDemoUserId`.** The four self-service mutations under `/users/me` are demo-protected because they'd break a shared account every visitor relies on; filing a ticket does neither, so all three demo accounts can create tickets like any other user. Only the account tabs check `isDemoUserId`.
- **`useTickets`/`useTicket` share one query-key prefix (`["tickets"]`) on purpose.** `useCreateTicket`'s `invalidateQueries({ queryKey: ["tickets"] })` matches by prefix, so a new ticket refreshes the list *and* any mounted detail view without either hook needing to know the other exists. `useCreateMessage` invalidates narrower — only that one ticket's messages key — since posting a message doesn't change the ticket list.
- **Pagination/sort state lives in the URL (`?page=&sortBy=&sortOrder=`), same pattern as the account page's `?tab=`.** A specific page or sort order is linkable and survives a refresh, and the query key `useTickets` builds from these params is what actually drives TanStack Query's caching — not local component state. `placeholderData: keepPreviousData` keeps the previous page on screen while the next one loads, so paging feels like flipping a page rather than a fresh loading spinner each time.
- **`PaginatedResult<T>` and the sort/pagination constants (`DEFAULT_PAGE`/`DEFAULT_LIMIT`, `TICKET_SORTABLE_FIELDS`, sort-order values) were promoted from backend-only into `@helpdesk/shared`**, mirroring the earlier `ACCESS_TOKEN_TTL_MS` precedent — the backend's `FindTicketsQueryDto`/`TicketsService` and the frontend's `useTickets` both import the same source instead of the frontend guessing at the shape of a page.
- **Close and reopen share one `TicketStatusModal` component**, parameterized by direction, rather than two near-identical modals — it mirrors the `Modal` primitive built for the account page's delete-account confirmation (focus trap, Escape/backdrop close) and shows the close/reopen reason history inline once a ticket has been through the cycle.
- **`POST /tickets/:id/messages` 400s on a `CLOSED` ticket (`TICKET_CLOSED_CANNOT_MESSAGE`)** — added alongside the detail page, since a compose box on a closed ticket needs somewhere to send that error. `MessageComposer` disables itself with an explanatory note when the ticket is closed, matching the backend guard rather than only discovering it on submit; reading the existing thread is unaffected by ticket status.
- **A ticket detail fetch distinguishes a genuine `404` from other errors** (`error instanceof ApiError && error.status === 404`) to show "ticket not found" copy instead of a generic error state — the backend intentionally returns `404`, not `403`, for a ticket that exists but isn't the caller's (see [api-endpoints.md](api-endpoints.md#tickets-tickets)), so the frontend can't and doesn't try to tell those two cases apart either.
- **`Button` (`components/ui/`) always renders a native `<button>` with no slot/`asChild` support for wrapping a `Link`.** Anywhere a link needs to look like a button — "New ticket" on the list page, "Cancel" on the creation form — the relevant variant's Tailwind classes are hand-rolled directly onto a real `<a>`/`next/link` instead of nesting elements, so ⌘-click/middle-click/"open in new tab" keep working.
- **`Message` only carries a `senderId`, not a name or role**, so `MessageThread` labels each entry "You" / "Support" / "AI Assistant" by comparing `senderId` against the viewer's own id (AI-generated messages are identified by `isAiGenerated`, not by sender) rather than resolving and displaying a real name.
- **The creation form redirects straight to `/tickets/:id` on success**, once the detail page existed to redirect to (Step 5.7) — the interim `TicketCreatedNotice` shown inline from Step 5.5, back when there was nowhere to send someone, was removed at that point.

## Deployment

```
Next.js  ──────────────►  Vercel
NestJS API ─────────────►  Google Cloud Run
PostgreSQL ─────────────►  Neon
Redis ──────────────────►  Upstash
```

Frontend and backend deploy independently; `packages/shared` provides the types both sides build against, so there's no runtime coupling — only a shared dev-time dependency.
