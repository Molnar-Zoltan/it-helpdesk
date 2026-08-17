/**
 * Config for `POST /admin/demo-reset` (Step 8.5). The whole wipe + reseed
 * runs inside one Prisma interactive transaction against Neon, which --
 * like Cloud Run itself -- scales its compute to zero when idle. The
 * cron that calls this endpoint only fires every ~48h
 * (.github/workflows/demo-reset.yml), so almost every real invocation pays
 * a cold-start penalty on top of the transaction's own round trips.
 * Prisma's default interactive-transaction timeout (5000ms, maxWait 2000ms)
 * doesn't leave enough margin for that combination -- it was hit in
 * production and surfaced only as a bare "Internal server error" (see
 * AdminService.resetDemoData's catch block for the fix to that part).
 * Raised well past a worst-case cold start rather than tuned to the common
 * case, since this endpoint runs on a schedule, not in the request path of
 * anything latency-sensitive.
 */
export const DEMO_RESET_TRANSACTION_TIMEOUT_MS = 20_000;
export const DEMO_RESET_TRANSACTION_MAX_WAIT_MS = 10_000;
