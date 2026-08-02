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

## Deployment

```
Next.js  ──────────────►  Vercel
NestJS API ─────────────►  Google Cloud Run
PostgreSQL ─────────────►  Neon
Redis ──────────────────►  Upstash
```

Frontend and backend deploy independently; `packages/shared` provides the types both sides build against, so there's no runtime coupling — only a shared dev-time dependency.
