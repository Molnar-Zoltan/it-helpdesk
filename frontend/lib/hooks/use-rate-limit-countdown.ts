"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * Derives a live, ticking countdown from a TanStack Query mutation's error
 * state whenever it's an ApiError carrying the given rate-limit `code` and
 * a retryAfterSeconds — the backend reads that straight off the Redis
 * key's TTL, so it's accurate to the second. Returns null whenever there's
 * nothing to count down (no matching error, or the countdown's finished).
 *
 * Ticks via setTimeout re-triggered each second rather than setInterval,
 * so it self-stops once it hits 0 instead of needing separate cleanup
 * logic for "reached zero" vs. "unmounted".
 */
export function useRateLimitCountdown(
  isError: boolean,
  error: unknown,
  code: string,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  // Tracks the last error object we've already reacted to, so a new
  // countdown only starts when a genuinely new mutation error arrives —
  // not on every re-render. Adjusting state directly during render (guarded
  // by this comparison) rather than in a useEffect is React's own
  // documented pattern for "storing information from previous renders";
  // it avoids an extra commit-then-effect cascade for what is otherwise a
  // synchronous derivation from props.
  const [lastSeenError, setLastSeenError] = useState<unknown>(null);

  if (isError && error !== lastSeenError) {
    setLastSeenError(error);
    if (
      error instanceof ApiError &&
      error.code === code &&
      typeof error.retryAfterSeconds === "number"
    ) {
      setRemaining(error.retryAfterSeconds);
    }
  }

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return remaining;
}

/** "125" -> "2:05". Only ever fed values under an hour (windows here are minutes at most). */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
