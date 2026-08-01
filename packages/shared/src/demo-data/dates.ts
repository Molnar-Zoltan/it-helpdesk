/**
 * Resolves a relative day offset into a real Date, evaluated against the
 * current time at call. Used to turn the fixture's `createdDaysAgo` /
 * `closedDaysAgo` fields into actual timestamps at seed time (backend) or
 * mock-response time (future MSW handlers), so the demo data always looks
 * recent instead of drifting stale with a frozen date baked into the fixture.
 */
export function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}
