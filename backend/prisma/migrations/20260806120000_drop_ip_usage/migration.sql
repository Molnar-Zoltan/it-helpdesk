-- DropTable
-- IpUsage was scaffolded during the initial schema pass for Postgres-backed
-- rate limiting, but Step 6 implements login rate limiting via Redis
-- instead (see docs/architecture.md#rate-limiting), and no code path ever
-- wrote to this table. Dropping it rather than leaving unused schema
-- alongside a working Redis-based rate limiter.
DROP TABLE "IpUsage";
