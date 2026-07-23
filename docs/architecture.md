# Architecture

## Ticket creation flow

Two entry points, one shared contract:

- **Manual form** — `POST /tickets` on the Next.js UI, validated with a Nest DTO, straight into `TicketsService.create()`.
- **AI chat** — the user chats with the assistant (Gemini, tool/function calling). Once enough detail has been gathered, the model calls a `create_ticket` tool with a structured payload. The backend intercepts that call, runs it through the **same** DTO and validation rules as the manual path, and calls the same `TicketsService.create()`.

Neither path can produce a ticket the other one wouldn't allow — the AI is a second producer, not a second contract.

The AI conversation itself is stored as `Message` rows on the resulting ticket (`type: AI`), so agents can see the original exchange without a separate conversation table.

## Rate limiting

One `RateLimitGuard`, backed by Redis (Upstash REST — no persistent connection needed, which matters since the backend on IBM Code Engine can scale to zero), is reused across three surfaces with different policies:

| Surface | Policy | Key |
|---|---|---|
| AI chat | 10 requests / day / user | `ratelimit:ai:{userId}:{date}` |
| Login | 5 attempts / 15 min | `ratelimit:login:{emailHash}:{ipHash}` |
| Registration | Cloudflare Turnstile CAPTCHA | n/a — one-shot verification, not a counter |

Login is keyed on **email + IP together**, not either alone: IP-only would let one bad actor lock out everyone behind the same NAT, and email-only would let someone hammer a single account from many IPs without ever tripping a per-IP limit.

Registration uses Turnstile instead of a request counter because signup is a one-shot action — a counter can't distinguish a bot spinning up new accounts from a genuine user who mistyped something on a first try, whereas a CAPTCHA challenge can.

## Deployment

```
Next.js  ──────────────►  Vercel
NestJS API ─────────────►  IBM Code Engine
PostgreSQL ─────────────►  Neon
Redis ──────────────────►  Upstash
```

Frontend and backend deploy independently; `packages/shared` provides the types both sides build against, so there's no runtime coupling — only a shared dev-time dependency.
