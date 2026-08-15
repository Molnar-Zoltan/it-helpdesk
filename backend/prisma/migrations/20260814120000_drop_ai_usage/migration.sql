-- DropTable
-- AiUsage was scaffolded during the initial schema pass for a per-user,
-- per-day AI-chat rate-limit counter, but Step 10.2 implements the AI
-- daily limit via Redis instead (INCR+EXPIRE, mirroring the login/ticket
-- rate limiters -- see docs/architecture.md#rate-limiting), for the same
-- reason Step 6 already moved IpUsage off Postgres: Cloud Run's
-- scale-to-zero doesn't suit a relational per-user-per-day counter, and
-- Redis avoids the [userId,date] unique-constraint race a table would
-- need to guard against. No code path ever wrote to this table.
DROP TABLE "AiUsage";
