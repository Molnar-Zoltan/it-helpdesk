import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';

export interface RateLimitStatus {
  limited: boolean;
  /** Seconds until the window resets. 0 if not limited or key doesn't exist. */
  retryAfterSeconds: number;
}

/**
 * Generic Redis-backed rate limiting, built around a fixed window that
 * starts on the first recorded event and expires naturally via Redis TTL
 * (no windowStart bucketing needed — one counter per key, one EXPIRE).
 *
 * Deliberately split into separate check/record/reset primitives rather
 * than a single "consume" call: the login guard needs to check the limit
 * *before* the attempt even runs, but only wants to increment it *after*
 * AuthService knows whether the attempt actually failed (see
 * architecture.md's rate-limiting table — this is what lets a correct
 * password on an early attempt clear the slate instead of counting against
 * the user forever within the window). Other consumers (ticket-creation
 * and ticket-message cooldowns, Step 9's AI daily limit) instead increment
 * unconditionally from within the guard itself, since every attempt there
 * costs the same regardless of outcome — increment()'s naming is
 * deliberately neutral to fit both.
 */
@Injectable()
export class RateLimitService {
  constructor(private redis: RedisService) {}

  /** Stable, non-reversible key fragment so raw emails/IPs never sit in Redis. */
  static hashIdentifier(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  async isLimited(key: string, max: number): Promise<RateLimitStatus> {
    const client = this.redis.getClient();
    const [countStr, ttl] = await Promise.all([
      client.get(key),
      client.ttl(key),
    ]);
    const count = countStr ? Number(countStr) : 0;
    if (count >= max) {
      return { limited: true, retryAfterSeconds: Math.max(ttl, 0) };
    }
    return { limited: false, retryAfterSeconds: 0 };
  }

  /**
   * Increments the counter, starting a fresh windowSeconds TTL only on the
   * first increment (so a key that's mid-window doesn't have its expiry
   * pushed back out by every subsequent call).
   */
  async increment(key: string, windowSeconds: number): Promise<void> {
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
  }

  async reset(key: string): Promise<void> {
    await this.redis.getClient().del(key);
  }
}
