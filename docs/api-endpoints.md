# API Endpoints

Current backend endpoints, grouped by controller. All request/response bodies are JSON.

> Source of truth: `backend/src/**/*.controller.ts`. Update this doc manually when routes change.

## Auth (`/auth`)

Unauthenticated-adjacent flows: registering, logging in, and renewing/ending a session. None of these require a valid access token — see [architecture.md](architecture.md#account-self-service--deletion-gdpr) for why this is split from `/users`.

### `POST /auth/register`
Creates a new account and returns an initial token pair.

**Body**
```json
{ "email": "user@example.com", "password": "string", "firstName": "string", "lastName": "string", "turnstileToken": "string" }
```
**Response** `200`
```json
{ "accessToken": "string", "refreshToken": "string" }
```
**Errors**: `409` if the email is already registered; `400` `TURNSTILE_VERIFICATION_FAILED` if `turnstileToken` is missing, invalid, expired, already used, or Cloudflare's siteverify API couldn't be reached — see [Registration CAPTCHA](#registration-captcha) below.

### `POST /auth/login`
Authenticates with email/password and returns a fresh token pair.

**Body**
```json
{ "email": "user@example.com", "password": "string" }
```
**Response** `200`: same shape as `/auth/register`.
**Errors**: `401` on invalid credentials; `429` `LOGIN_RATE_LIMITED` if this email+IP pair has hit 5 failed attempts within the last 15 minutes — see [Login rate limiting](#login-rate-limiting) below.

### `POST /auth/refresh`
Rotates a refresh token: the one supplied is revoked, and a new access/refresh pair is issued.

**Body**
```json
{ "refreshToken": "string" }
```
**Response** `200`: same shape as `/auth/register`.
**Errors**: `401` if the token is invalid, expired, or already revoked.

### `POST /auth/logout`
Revokes a refresh token, ending that session.

**Body**
```json
{ "refreshToken": "string" }
```
**Response** `200`, no meaningful body.

### Login rate limiting

`POST /auth/login` is guarded by a Redis-backed limiter (`LoginRateLimitGuard`): 5 failed attempts within a 15-minute window for a given email+IP pair returns `429`:

```json
{ "statusCode": 429, "error": "LOGIN_RATE_LIMITED", "message": "Too many login attempts. Please try again later.", "retryAfterSeconds": 612 }
```

`retryAfterSeconds` is read straight off the Redis key's remaining TTL, so it's always accurate to the second rather than a rounded-down window estimate — the frontend's login form uses it to show a live countdown.

Keyed on email+IP together (`ratelimit:login:{emailHash}:{ipHash}`, both SHA-256-truncated so raw emails/IPs never sit in Redis), not either alone — IP-only would let one bad actor lock out everyone behind the same NAT, email-only would let someone hammer a single account from many IPs. Only *failed* attempts increment the counter, and a successful login resets it — a mistyped password early on doesn't count against the rest of the window once the user gets it right (see `docs/architecture.md#rate-limiting` for the full design).

Since the backend's Cloud Run instance only ever sees connections from either the frontend's server-side proxy or a direct caller, `main.ts` sets `trust proxy` to trust exactly one hop (Cloud Run's Google Front End) so `req.ip` reflects the real client rather than the connecting proxy's own address; the frontend's `/api/auth/login` route handler explicitly forwards the browser's `x-forwarded-for` header for the same reason.

### Registration CAPTCHA

`POST /auth/register` is guarded by `TurnstileGuard`, which verifies the request's `turnstileToken` against Cloudflare's Turnstile siteverify API before the request reaches `RegisterDto` validation. A missing, invalid, expired, or already-spent token returns `400`:

```json
{ "statusCode": 400, "error": "TURNSTILE_VERIFICATION_FAILED", "message": "Captcha verification failed. Please try again." }
```

Unlike the HIBP breach check on password strength (an advisory soft-warning that fails open if the check's own API is unreachable), Turnstile is a hard anti-bot gate and fails **closed**: if Cloudflare's siteverify API is unreachable, slow, or errors, the token is treated as failed verification rather than let through. A brief Cloudflare outage blocking new registrations is judged a smaller cost than silently having no bot protection during that window.

Turnstile tokens are single-use — a token consumed by one `POST /auth/register` call (successful or not) can't be reused on a second call, including a resubmit after a `422 WEAK_PASSWORD_WARNING` on the same request. The frontend's register form resets its Turnstile widget and requires a fresh token before any resubmit for this reason.

Registration uses a CAPTCHA challenge rather than a Redis-backed request counter (unlike login/ticket-creation/messages) because signup is a one-shot action — a counter can't distinguish a bot spinning up accounts from a genuine user who mistyped something on a first try, whereas a CAPTCHA challenge can (see `docs/architecture.md#rate-limiting`).

---

## Users (`/users`)

Actions on the currently authenticated user's own record. All routes require `Authorization: Bearer <accessToken>` and act on the `userId` embedded in that token — none take an id in the URL or body.

### `GET /users/me`
Returns the authenticated user's profile.

**Response** `200`
```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "CUSTOMER | AGENT | ADMIN",
  "createdAt": "ISO 8601 datetime"
}
```
**Errors**: `404` if the user no longer exists (e.g. token outlived a deleted account).

### `PATCH /users/me`
Updates first and/or last name. No `currentPassword` required — name isn't a security-sensitive field.

**Body** (both optional; send only the field(s) you want to change)
```json
{ "firstName": "string", "lastName": "string" }
```
**Response** `200`
```json
{ "id": "string", "firstName": "string", "lastName": "string" }
```
**Errors**: `403` if this is one of the three seeded demo accounts — see [Demo account protection](#demo-account-protection).

### `PATCH /users/me/password`
Changes the account password. Requires `currentPassword` for re-verification. Revokes every other active refresh token, keeping the session that made the request alive.

**Body**
```json
{ "currentPassword": "string", "newPassword": "string" }
```
**Response** `200`
```json
{ "message": "Password updated" }
```
**Errors**: `401` if `currentPassword` doesn't match; `403` if this is one of the three seeded demo accounts — see [Demo account protection](#demo-account-protection).

### `PATCH /users/me/email`
Changes the account email. Requires `currentPassword`. Revokes every other active refresh token, keeping the current session alive — same pattern as password change.

**Body**
```json
{ "currentPassword": "string", "newEmail": "user@example.com" }
```
**Response** `200`
```json
{ "message": "Email updated" }
```
**Errors**: `401` if `currentPassword` doesn't match; `400` if `newEmail` is the same as the account's current email; `409` if `newEmail` is already registered to another account; `403` if this is one of the three seeded demo accounts — see [Demo account protection](#demo-account-protection).

### `DELETE /users/me`
Deletes the account. Requires `currentPassword`. This is a hard delete of the `User` row and all their `RefreshToken`s (cascade); their `Ticket`/`Message` history is **not** deleted — see [schema.md](schema.md#gdpr--account-deletion-behavior) for the anonymization behavior.

**Body**
```json
{ "currentPassword": "string" }
```
**Response** `200`
```json
{ "message": "Account deleted" }
```
**Errors**: `401` if `currentPassword` doesn't match; `403` if this is one of the three seeded demo accounts — see [Demo account protection](#demo-account-protection).

### Demo account protection

All four self-service mutations above (`PATCH /users/me`, `PATCH /users/me/password`, `PATCH /users/me/email`, `DELETE /users/me`) are blocked with `403 DEMO_ACCOUNT_PROTECTED` when called against one of the three seeded demo accounts (`admin@helpdesk.dev`, `agent@helpdesk.dev`, `customer@helpdesk.dev`). These credentials are published in the README for the live demo, so without this guard anyone could lock out, rename, or delete a shared account that every visitor relies on.

The check (`UsersService.assertNotDemoAccount`) looks up the caller's `userId` against `DEMO_USER_IDS`, exported from [`packages/shared`](../packages/shared/src/demo-data/fixture.ts) — the same fixture `seed.ts` inserts from — rather than a DB column or an ID-naming convention. This keeps demo-account identity in one place and lets the frontend reuse the identical `isDemoUserId()` check to disable the relevant UI without a round-trip. It runs before password re-verification, so it applies even when the (publicly known) demo password is supplied correctly.

---

## Tickets (`/tickets`)

Manual ticket creation and self-service ticket management for customers. All routes require `Authorization: Bearer <accessToken>`. Unless noted otherwise, a ticket is only visible to the customer who filed it — any other user (including an agent, until Step 9's assignment model exists) gets a `404`, not a `403`, so requests can't be used to probe which ticket IDs exist.

### `POST /tickets`
Creates a new ticket. `customerId` is always derived from the access token — it can never be set via the request body. New tickets always start at `status: OPEN` with no `agentId` (assignment doesn't exist until Step 9).

**Body**
```json
{ "title": "string (3-150 chars)", "description": "string (10-5000 chars)", "priority": "LOW | MEDIUM | HIGH | URGENT (optional, default MEDIUM)" }
```
**Response** `201`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "OPEN",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime",
  "customerId": "string",
  "agentId": null
}
```
**Errors**: `400` on validation failure (title/description length, invalid priority, emoji content); `429` `TICKET_CREATE_RATE_LIMITED` if called again within 60 seconds of the last attempt — see [Ticket rate limiting](#ticket-rate-limiting) below.

### `GET /tickets`
Lists the authenticated user's own tickets, paginated and sortable.

**Query params**
| Param | Default | Notes |
|---|---|---|
| `page` | `1` | 1-indexed |
| `limit` | `10` | capped at `100` |
| `sortBy` | `createdAt` | one of `createdAt`, `updatedAt`, `priority`, `status` |
| `sortOrder` | `desc` | `asc` or `desc` |

**Response** `200`
```json
{
  "data": [ /* array of Ticket objects, same shape as POST /tickets response */ ],
  "page": 1,
  "limit": 10,
  "total": 12,
  "totalPages": 2
}
```
**Errors**: `400` if `page`/`limit` are out of range or `sortBy`/`sortOrder` aren't recognized values.

### `GET /tickets/:id`
Returns a single ticket owned by the authenticated user.

**Response** `200`: a single Ticket object, same shape as `POST /tickets`.
**Errors**: `404` if the ticket doesn't exist or isn't owned by the requester.

### `PATCH /tickets/:id/close`
Customer-initiated close. Valid from `OPEN`, `IN_PROGRESS`, or `RESOLVED` — customers can close a ticket at any of those stages, not just once it's `RESOLVED`. Always moves the ticket to `CLOSED`. This is a narrow, single-purpose endpoint, not a general status-update route; agent-driven status transitions are Step 9 territory.

**Body**
```json
{ "reason": "string (3-1000 chars)" }
```
**Response** `200`: the updated Ticket object, now including `closeReason`, `closedAt`, `closedBy`.
**Errors**: `400` `TICKET_ALREADY_CLOSED` if the ticket is already `CLOSED`, or validation errors on `reason` (missing, too short/long, or contains emoji); `404` if the ticket doesn't exist or isn't owned by the requester.

### `PATCH /tickets/:id/reopen`
Customer-initiated reopen, with no time window. Valid only from `CLOSED`; always resets the ticket to `OPEN` (a ticket that already had an agent assigned before closing may arguably deserve `IN_PROGRESS` instead — revisit once Step 9 assignment exists). The original `closeReason`/`closedAt`/`closedBy` are left untouched, as a historical record of the earlier close.

**Body**
```json
{ "reason": "string (3-1000 chars)" }
```
**Response** `200`: the updated Ticket object, now including `reopenReason`, `reopenedAt`, `reopenedBy` (separate fields from the close ones, in case a ticket cycles through close/reopen more than once — the current schema keeps a single snapshot of each, not full history).
**Errors**: `400` `TICKET_NOT_CLOSED` if the ticket isn't currently `CLOSED`, or validation errors on `reason`; `404` if the ticket doesn't exist or isn't owned by the requester.

### `POST /tickets/:id/messages`
Adds a message to a ticket's thread. `senderId` is always derived from the access token. Visible to the ticket's owning customer, or to any user with role `AGENT`/`ADMIN` (not yet scoped to a specific *assigned* agent, since assignment doesn't exist until Step 9). `isAiGenerated` defaults to `false`; the AI chat path (Step 10) will write its own `Message` rows separately.

**Body**
```json
{ "content": "string (1-5000 chars)" }
```
**Response** `201`
```json
{
  "id": "string",
  "content": "string",
  "isAiGenerated": false,
  "createdAt": "ISO 8601 datetime",
  "ticketId": "string",
  "senderId": "string"
}
```
**Errors**: `400` on validation failure (missing/oversized/emoji content); `400` `TICKET_CLOSED_CANNOT_MESSAGE` if the ticket's `status` is `CLOSED` (reading the existing thread via `GET /tickets/:id/messages` is unaffected — reopen the ticket to post again); `404` if the ticket doesn't exist or the requester can't access it; `429` `TICKET_MESSAGE_RATE_LIMITED` if called again on the same ticket within 10 seconds of the last message — see [Ticket rate limiting](#ticket-rate-limiting) below.

### `GET /tickets/:id/messages`
Returns the full message thread for a ticket, ordered oldest-first (`createdAt` ascending — the reverse of `GET /tickets`' newest-first default, since a conversation reads chronologically). Same visibility rule as `POST /tickets/:id/messages`.

**Response** `200`: array of Message objects, same shape as the `POST /tickets/:id/messages` response.
**Errors**: `404` if the ticket doesn't exist or the requester can't access it.

### Ticket rate limiting

`POST /tickets` and `POST /tickets/:id/messages` are both guarded by anti-spam cooldowns (`TicketCreateRateLimitGuard`/`TicketMessageRateLimitGuard`) — unlike login's rate limit, this isn't brute-force protection, it's protection against DB-growth abuse. The three seeded demo accounts' credentials are published in this README for the live demo, and registration is open with no CAPTCHA until Step 7 lands, so either path is an easy way to flood the shared demo (or any account) with junk data otherwise.

| Endpoint | Cooldown | Key | Error |
|---|---|---|---|
| `POST /tickets` | 60 seconds | `ratelimit:ticket-create:{userId}` | `429 TICKET_CREATE_RATE_LIMITED` |
| `POST /tickets/:id/messages` | 10 seconds | `ratelimit:ticket-message:{userId}:{ticketId}` | `429 TICKET_MESSAGE_RATE_LIMITED` |

Both return the same shape as login's `429` (`retryAfterSeconds` read off the Redis key's TTL), and the frontend shows the same live countdown pattern on `/tickets/new` and a ticket's message composer.

Every attempt counts against the cooldown, success or not — unlike login (which only counts *failed* attempts, so a mistyped password doesn't cost the window), the cost being defended against here is incurred by the attempt itself, not by whether it succeeds. Ticket creation gets a full minute since filing more than one new ticket within 60s isn't something a real user does; messages get a much shorter 10 seconds since a support thread is genuinely conversational and a longer cooldown would get in the way of a real back-and-forth — 10s is enough to stop a spam script firing requests back-to-back without a human ever noticing it's there.

Messages are scoped per-ticket (not just per-user) so a cooldown on one thread doesn't block replying on another.

---

## Admin (`/admin`)

### `POST /admin/demo-reset`
Wipes every row in the database and re-seeds the demo fixture (the same three demo accounts and sample tickets/messages `seed.ts` produces). Called on a ~48-hour schedule by `.github/workflows/demo-reset.yml`, so the public live demo doesn't accumulate ticket/message data or real signups indefinitely.

**Auth**: not `Authorization: Bearer <accessToken>` — a required `x-admin-reset-secret` header, checked against the `ADMIN_RESET_SECRET` env var by `DemoResetGuard`. Deliberately not JWT/role-based: the only intended caller is the scheduled workflow, not a logged-in user, so even the demo `ADMIN` account's own access token grants no access here.

**Body**: none.

**Response** `200`
```json
{ "message": "Demo data reset", "users": 3, "tickets": 9, "messages": 1 }
```
**Errors**: `401` if the header is missing, wrong, or `ADMIN_RESET_SECRET` isn't configured on the server.

---

## Auth model summary

| Endpoint | Auth required | `currentPassword` required | Revokes other sessions | Blocked on demo accounts |
|---|---|---|---|---|
| `POST /auth/register` | No | — | — | — |
| `POST /auth/login` | No | — | — | No — demo accounts can still log in |
| `POST /auth/refresh` | No (refresh token in body) | — | — | — |
| `POST /auth/logout` | No (refresh token in body) | — | — | — |
| `GET /users/me` | Yes | No | — | No |
| `PATCH /users/me` | Yes | No | No | Yes |
| `PATCH /users/me/password` | Yes | Yes | Yes, except current session | Yes |
| `PATCH /users/me/email` | Yes | Yes | Yes, except current session | Yes |
| `DELETE /users/me` | Yes | Yes | Yes, all (cascade) | Yes |

The access token payload is `{ sub: userId, role, refreshTokenId, iat, exp }` — `refreshTokenId` is what lets password/email change identify and exclude the calling session from bulk revocation. See [Demo account protection](#demo-account-protection) for the last column, [Login rate limiting](#login-rate-limiting) for `POST /auth/login`'s additional `429` case, and [Registration CAPTCHA](#registration-captcha) for `POST /auth/register`'s additional `400 TURNSTILE_VERIFICATION_FAILED` case (neither captured in this table, since both apply regardless of `Blocked on demo accounts` — demo accounts still need a valid Turnstile token to register, though in practice they're only ever seeded, not registered through this endpoint).

## Ticket endpoint access summary

| Endpoint | Auth required | Visible to |
|---|---|---|
| `POST /tickets` | Yes | n/a — creates a ticket owned by the caller |
| `GET /tickets` | Yes | Caller's own tickets only |
| `GET /tickets/:id` | Yes | Owning customer only (`404` otherwise) |
| `PATCH /tickets/:id/close` | Yes | Owning customer only (`404` otherwise) |
| `PATCH /tickets/:id/reopen` | Yes | Owning customer only (`404` otherwise) |
| `POST /tickets/:id/messages` | Yes | Owning customer, or any `AGENT`/`ADMIN` |
| `GET /tickets/:id/messages` | Yes | Owning customer, or any `AGENT`/`ADMIN` |

Every ticket route returns `404`, not `403`, when the requester isn't allowed to see the ticket — this avoids leaking whether a given ticket ID exists to someone who isn't its owner.

`POST /tickets/:id/messages` additionally 400s on a `CLOSED` ticket (`TICKET_CLOSED_CANNOT_MESSAGE`) — a closed ticket isn't being actively worked, so new messages are blocked until it's reopened. `GET /tickets/:id/messages` has no such restriction; the existing thread stays readable regardless of status.

See [Ticket rate limiting](#ticket-rate-limiting) for `POST /tickets`' and `POST /tickets/:id/messages`' additional `429` case (not captured in this table, since it applies the same way regardless of `Visible to`).

---

## Validation rules

Field-level constraints below are enforced server-side via `class-validator` decorators on the relevant DTOs (`backend/src/**/dto/*.dto.ts`), sourced from shared constants in [`packages/shared/src/validation/`](../packages/shared/src/validation/) — the frontend can import the same constants instead of duplicating or guessing these numbers. See [architecture.md](architecture.md#validation) for how the pattern is wired together.

| Field | Used in | Constraint |
|---|---|---|
| `email` | register, login, `PATCH /users/me/email` | ≤254 chars (RFC 5321); format checked via `class-validator`'s `IsEmail` |
| `password` (new) | register, `PATCH /users/me/password` | 8–64 chars; at least one uppercase letter, one lowercase letter, one digit, one special character; rejects the 1000 most common leaked passwords; no emoji |
| `password` (login) | login | ≤64 chars only — no minimum length or strength check, since login must accept whatever an existing account was created with |
| `firstName` / `lastName` | register, `PATCH /users/me` | 1–50 chars; Unicode letters (any script) plus spaces, hyphens, and apostrophes; no emoji, no digits, no repeated separators (e.g. `--`, `''`) |
| ticket `title` | `POST /tickets` | 3–150 chars; no emoji |
| ticket `description` | `POST /tickets` | 10–5000 chars; no emoji |
| ticket close `reason` | `PATCH /tickets/:id/close` | 3–1000 chars, required; no emoji |
| ticket reopen `reason` | `PATCH /tickets/:id/reopen` | 3–1000 chars, required; no emoji (separate constants from close's, deliberately decoupled even though currently identical) |
| message `content` | `POST /tickets/:id/messages` | 1–5000 chars; no emoji |
