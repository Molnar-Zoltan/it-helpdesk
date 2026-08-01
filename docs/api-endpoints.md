# API Endpoints

Current backend endpoints, grouped by controller. All request/response bodies are JSON.

> Source of truth: `backend/src/**/*.controller.ts`. Update this doc manually when routes change.

## Auth (`/auth`)

Unauthenticated-adjacent flows: registering, logging in, and renewing/ending a session. None of these require a valid access token — see [architecture.md](architecture.md#account-self-service--deletion-gdpr) for why this is split from `/users`.

### `POST /auth/register`
Creates a new account and returns an initial token pair.

**Body**
```json
{ "email": "user@example.com", "password": "string", "firstName": "string", "lastName": "string" }
```
**Response** `200`
```json
{ "accessToken": "string", "refreshToken": "string" }
```
**Errors**: `409` if the email is already registered.

### `POST /auth/login`
Authenticates with email/password and returns a fresh token pair.

**Body**
```json
{ "email": "user@example.com", "password": "string" }
```
**Response** `200`: same shape as `/auth/register`.
**Errors**: `401` on invalid credentials.

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
**Errors**: `401` if `currentPassword` doesn't match.

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
**Errors**: `401` if `currentPassword` doesn't match; `409` if `newEmail` is already registered to another account.

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
**Errors**: `401` if `currentPassword` doesn't match.

---

## Tickets (`/tickets`)

Manual ticket creation and self-service ticket management for customers. All routes require `Authorization: Bearer <accessToken>`. Unless noted otherwise, a ticket is only visible to the customer who filed it — any other user (including an agent, until Step 8's assignment model exists) gets a `404`, not a `403`, so requests can't be used to probe which ticket IDs exist.

### `POST /tickets`
Creates a new ticket. `customerId` is always derived from the access token — it can never be set via the request body. New tickets always start at `status: OPEN` with no `agentId` (assignment doesn't exist until Step 8).

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
**Errors**: `400` on validation failure (title/description length, invalid priority, emoji content).

### `GET /tickets`
Lists the authenticated user's own tickets, paginated and sortable.

**Query params**
| Param | Default | Notes |
|---|---|---|
| `page` | `1` | 1-indexed |
| `limit` | `20` | capped at `100` |
| `sortBy` | `createdAt` | one of `createdAt`, `updatedAt`, `priority`, `status` |
| `sortOrder` | `desc` | `asc` or `desc` |

**Response** `200`
```json
{
  "data": [ /* array of Ticket objects, same shape as POST /tickets response */ ],
  "page": 1,
  "limit": 20,
  "total": 9,
  "totalPages": 1
}
```
**Errors**: `400` if `page`/`limit` are out of range or `sortBy`/`sortOrder` aren't recognized values.

### `GET /tickets/:id`
Returns a single ticket owned by the authenticated user.

**Response** `200`: a single Ticket object, same shape as `POST /tickets`.
**Errors**: `404` if the ticket doesn't exist or isn't owned by the requester.

### `PATCH /tickets/:id/close`
Customer-initiated close. Valid from `OPEN`, `IN_PROGRESS`, or `RESOLVED` — customers can close a ticket at any of those stages, not just once it's `RESOLVED`. Always moves the ticket to `CLOSED`. This is a narrow, single-purpose endpoint, not a general status-update route; agent-driven status transitions are Step 8 territory.

**Body**
```json
{ "reason": "string (3-1000 chars)" }
```
**Response** `200`: the updated Ticket object, now including `closeReason`, `closedAt`, `closedBy`.
**Errors**: `400` `TICKET_ALREADY_CLOSED` if the ticket is already `CLOSED`, or validation errors on `reason` (missing, too short/long, or contains emoji); `404` if the ticket doesn't exist or isn't owned by the requester.

### `PATCH /tickets/:id/reopen`
Customer-initiated reopen, with no time window. Valid only from `CLOSED`; always resets the ticket to `OPEN` (a ticket that already had an agent assigned before closing may arguably deserve `IN_PROGRESS` instead — revisit once Step 8 assignment exists). The original `closeReason`/`closedAt`/`closedBy` are left untouched, as a historical record of the earlier close.

**Body**
```json
{ "reason": "string (3-1000 chars)" }
```
**Response** `200`: the updated Ticket object, now including `reopenReason`, `reopenedAt`, `reopenedBy` (separate fields from the close ones, in case a ticket cycles through close/reopen more than once — the current schema keeps a single snapshot of each, not full history).
**Errors**: `400` `TICKET_NOT_CLOSED` if the ticket isn't currently `CLOSED`, or validation errors on `reason`; `404` if the ticket doesn't exist or isn't owned by the requester.

### `POST /tickets/:id/messages`
Adds a message to a ticket's thread. `senderId` is always derived from the access token. Visible to the ticket's owning customer, or to any user with role `AGENT`/`ADMIN` (not yet scoped to a specific *assigned* agent, since assignment doesn't exist until Step 8). `isAiGenerated` defaults to `false`; the AI chat path (Step 9) will write its own `Message` rows separately.

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
**Errors**: `400` on validation failure (missing/oversized/emoji content); `404` if the ticket doesn't exist or the requester can't access it.

### `GET /tickets/:id/messages`
Returns the full message thread for a ticket, ordered oldest-first (`createdAt` ascending — the reverse of `GET /tickets`' newest-first default, since a conversation reads chronologically). Same visibility rule as `POST /tickets/:id/messages`.

**Response** `200`: array of Message objects, same shape as the `POST /tickets/:id/messages` response.
**Errors**: `404` if the ticket doesn't exist or the requester can't access it.

---

## Auth model summary

| Endpoint | Auth required | `currentPassword` required | Revokes other sessions |
|---|---|---|---|
| `POST /auth/register` | No | — | — |
| `POST /auth/login` | No | — | — |
| `POST /auth/refresh` | No (refresh token in body) | — | — |
| `POST /auth/logout` | No (refresh token in body) | — | — |
| `GET /users/me` | Yes | No | — |
| `PATCH /users/me` | Yes | No | No |
| `PATCH /users/me/password` | Yes | Yes | Yes, except current session |
| `PATCH /users/me/email` | Yes | Yes | Yes, except current session |
| `DELETE /users/me` | Yes | Yes | Yes, all (cascade) |

The access token payload is `{ sub: userId, role, refreshTokenId, iat, exp }` — `refreshTokenId` is what lets password/email change identify and exclude the calling session from bulk revocation.

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
