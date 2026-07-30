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

> `POST /tickets` itself isn't documented as its own section yet — tracked as a follow-up alongside `GET /tickets` and `GET /tickets/:id` once Step 4 is fully wrapped up.