# Database Schema

This document describes the Prisma schema for the IT Helpdesk application: models, fields, enums, and how they relate to each other.

> Source of truth: `backend/prisma/schema.prisma`. Regenerate this doc manually if the schema changes.

## Overview

| Model | Purpose |
|---|---|
| `User` | Customers, agents, and admins |
| `Ticket` | A support ticket filed by a customer, optionally assigned to an agent |
| `Message` | A message thread entry on a ticket (human or AI-generated) |
| `AiUsage` | Per-user, per-day counter for AI chat rate limiting |
| `IpUsage` | Per-IP, per-action, per-time-window counter for rate limiting (e.g. login attempts) |
| `RefreshToken` | Hashed refresh tokens issued to a user for session renewal |

## Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Ticket : "files (customer)"
    User ||--o{ Ticket : "handles (agent)"
    User ||--o{ Message : sends
    User ||--o{ AiUsage : has
    User ||--o{ RefreshToken : has
    Ticket ||--o{ Message : contains

    User {
        string id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        Role role
        datetime createdAt
        datetime updatedAt
    }

    Ticket {
        string id PK
        string title
        string description
        TicketStatus status
        TicketPriority priority
        datetime createdAt
        datetime updatedAt
        string customerId FK
        string agentId FK "nullable"
    }

    Message {
        string id PK
        string content
        boolean isAiGenerated
        datetime createdAt
        string ticketId FK
        string senderId FK
    }

    AiUsage {
        string id PK
        string userId FK
        date date
        int count
    }

    IpUsage {
        string id PK
        string ipAddress
        string action
        datetime windowStart
        int count
    }

    RefreshToken {
        string id PK
        string tokenHash UK
        string userId FK
        datetime expiresAt
        boolean revoked
        datetime createdAt
    }
```

## Enums

### `Role`
| Value | Description |
|---|---|
| `CUSTOMER` | Default role; can create and view own tickets |
| `AGENT` | Can view and manage the ticket queue |
| `ADMIN` | Full access |

### `TicketStatus`
| Value | Description |
|---|---|
| `OPEN` | Newly created, unresolved |
| `IN_PROGRESS` | Being worked on by an agent |
| `RESOLVED` | Fixed, pending customer confirmation |
| `CLOSED` | Finalized |

### `TicketPriority`
| Value | Description |
|---|---|
| `LOW` | |
| `MEDIUM` | Default |
| `HIGH` | |
| `URGENT` | |

## Models and Relations

### `User`
Central identity model. A user's `role` determines what they can do; a single `User` row can act as both a ticket-filer and, if their role permits, an agent on other tickets.

- `ticketsAsCustomer` — tickets this user filed (`Ticket.customer`, relation name `CustomerTickets`)
- `ticketsAsAgent` — tickets this user is assigned to (`Ticket.agent`, relation name `AgentTickets`)
- `messages` — all messages this user has sent, across any ticket
- `aiUsages` — daily AI-chat usage counters, for rate limiting
- `refreshTokens` — active/expired refresh tokens issued to this user

Two named relations (`CustomerTickets`, `AgentTickets`) exist because `Ticket` has two separate foreign keys pointing back to `User` (customer and agent), so Prisma needs the relation name to disambiguate which is which.

### `Ticket`
The core support request. Belongs to exactly one customer; may or may not have an agent assigned yet.

- `customer` (required) — the `User` who filed the ticket, via `customerId`
- `agent` (optional) — the `User` currently assigned, via `agentId`; `null` means unassigned
- `messages` — the full conversation thread on this ticket

### `Message`
A single entry in a ticket's conversation. Can come from a customer, an agent, or be AI-generated (`isAiGenerated: true`) when the AI chat path (Step 5 of the build plan) creates or replies to a ticket on the user's behalf.

- `ticket` — the parent ticket, via `ticketId`
- `sender` — the `User` who sent it, via `senderId`

### `AiUsage`
Tracks how many AI chat requests a user has made on a given calendar day, backing the "10 AI requests/day" rate limit. `@@unique([userId, date])` ensures one row per user per day; `count` is incremented on each request.

### `IpUsage`
Tracks rate-limited actions by IP address rather than by user — used for things like login-attempt throttling (5 attempts / 15 min) where the actor may not be authenticated yet. `@@unique([ipAddress, action, windowStart])` scopes the counter to a specific action type and time window.

### `RefreshToken`
Issued on login/refresh to allow session renewal without re-authenticating. Only the **hash** of the token is stored (`tokenHash`), never the raw token. `revoked` allows explicit invalidation (e.g. on logout or password change) before `expiresAt` naturally elapses.

## Notes

- All primary keys use `cuid()`.
- Timestamps: `createdAt` defaults to `now()`; `updatedAt` auto-updates on write via `@updatedAt`.
- Prisma v7: the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`. `PrismaClient` requires a driver adapter (`@prisma/adapter-pg`) at instantiation.
