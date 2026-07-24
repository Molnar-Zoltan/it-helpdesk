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

backend/prisma/
  prisma.module.ts
  prisma.service.ts
```

- `backend/src/auth/` — owns authentication and JWT-based identity handling for register/login/refresh/logout flows; main files: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `dto/login.dto.ts`, `dto/register.dto.ts`, `guards/jwt-auth.guard.ts`, `guards/roles.guard.ts` (role-based route restriction via `@Roles()`, built but not yet applied to any endpoint — no current route needs more than authentication), `strategies/jwt.strategy.ts`, `token.util.ts`.
- `backend/src/users/` — owns authenticated self-service account actions for the signed-in user; main files: `users.controller.ts`, `users.service.ts`, `users.module.ts`, `dto/change-email.dto.ts`, `dto/change-password.dto.ts`, `dto/delete-account.dto.ts`, `dto/update-name.dto.ts`, `types/authenticated-request.type.ts`.
- `backend/prisma/` — shared persistence wiring for Prisma access and database setup; main files: `prisma.service.ts`, `prisma.module.ts`, `schema.prisma`, `seed.ts`.

No `tickets/`, `ai/`, or `rate-limit/` modules are implemented yet, so those responsibilities are still centralized rather than split into dedicated Nest modules.

## Rate limiting

One `RateLimitGuard`, backed by Redis (Upstash REST — no persistent connection needed, which matters since the backend on IBM Code Engine can scale to zero), is reused across three surfaces with different policies:

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

## Deployment

```
Next.js  ──────────────►  Vercel
NestJS API ─────────────►  IBM Code Engine
PostgreSQL ─────────────►  Neon
Redis ──────────────────►  Upstash
```

Frontend and backend deploy independently; `packages/shared` provides the types both sides build against, so there's no runtime coupling — only a shared dev-time dependency.
