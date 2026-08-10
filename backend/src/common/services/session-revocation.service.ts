import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { JWT_ACCESS_EXPIRY } from '../constants/auth.constants';

/**
 * Closes the gap between a `RefreshToken` row being marked `revoked` in
 * Postgres and that revocation actually taking effect. Access tokens are
 * stateless JWTs — `JwtStrategy.validate()` only checks the signature and
 * `exp`, never the database — so a session whose refresh token was just
 * revoked (password/email change, logout, account deletion) stays
 * functionally logged in for up to `ACCESS_TOKEN_TTL_MS` until it next
 * hits `/auth/refresh` and finally sees the DB flag.
 *
 * This adds a live, per-request check via a Redis denylist keyed on the
 * access token's `refreshTokenId` claim. It's an enforcement cache, not a
 * new source of truth: the `RefreshToken.revoked` column in Postgres
 * remains authoritative for `/auth/refresh`, unaffected by anything here.
 * If Redis is briefly unreachable, callers fail OPEN (see call sites) —
 * worst case the system behaves exactly as it did before this existed
 * (revoked at next refresh, within `ACCESS_TOKEN_TTL_MS`), never worse.
 *
 * Key TTL is capped at `ACCESS_TOKEN_TTL_MS`: no access token bearing this
 * `refreshTokenId` can still pass signature/exp verification after that,
 * so the key can safely expire itself with no cleanup job.
 */
@Injectable()
export class SessionRevocationService {
  private readonly logger = new Logger(SessionRevocationService.name);

  constructor(private redis: RedisService) {}

  private static key(refreshTokenId: string): string {
    return `revoked:refreshToken:${refreshTokenId}`;
  }

  /**
   * Marks a single session's access tokens as immediately unusable.
   * Fails OPEN: a Redis error here must never fail the password/email
   * change, logout, or account deletion that triggered it — the DB-level
   * revocation these call sites already perform is unaffected, so the
   * worst case is falling back to revocation-at-next-refresh, not losing
   * the underlying action.
   */
  async revoke(refreshTokenId: string): Promise<void> {
    try {
      const ttlSeconds = Math.ceil(JWT_ACCESS_EXPIRY);
      await this.redis
        .getClient()
        .set(
          SessionRevocationService.key(refreshTokenId),
          '1',
          'EX',
          ttlSeconds,
        );
    } catch (err) {
      this.logger.warn(
        `Failed to write session revocation to Redis for refreshTokenId=${refreshTokenId}; ` +
          `falling back to revocation-at-next-refresh: ${(err as Error).message}`,
      );
    }
  }

  /** Convenience for revoking several sessions at once (bulk logout, account deletion). */
  async revokeMany(refreshTokenIds: string[]): Promise<void> {
    await Promise.all(refreshTokenIds.map((id) => this.revoke(id)));
  }

  /**
   * Fails OPEN: if Redis is unreachable, requests are treated as NOT
   * revoked rather than rejecting every authenticated request in the
   * system. This matches the fail-open posture already used elsewhere in
   * this codebase (e.g. PwnedPasswordService) — an outage in a
   * best-effort enforcement layer shouldn't take down auth entirely, and
   * the DB-level check at `/auth/refresh` remains a hard backstop either way.
   */
  async isRevoked(refreshTokenId: string): Promise<boolean> {
    try {
      const exists = await this.redis
        .getClient()
        .exists(SessionRevocationService.key(refreshTokenId));
      return exists === 1;
    } catch (err) {
      this.logger.warn(
        `Failed to check session revocation in Redis for refreshTokenId=${refreshTokenId}; ` +
          `failing open: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
