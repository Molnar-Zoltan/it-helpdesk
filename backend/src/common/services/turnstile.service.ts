import { Injectable, Logger } from '@nestjs/common';
import {
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_REQUEST_TIMEOUT_MS,
} from '../constants/turnstile.constants';
import { requireEnv } from '../../auth/token.util';

/**
 * Verifies a Cloudflare Turnstile token against the siteverify API, used to
 * gate POST /auth/register against bots (Step 7).
 *
 * Unlike PwnedPasswordService (a soft, advisory signal that fails OPEN),
 * this is a hard anti-bot gate, so it fails CLOSED: if the siteverify API
 * is unreachable, slow, or errors, `verify()` resolves to `false` (treated
 * as "verification failed") rather than letting registration through. A
 * Cloudflare outage blocking new signups for a few minutes is a smaller
 * cost than silently having no bot protection during that window — see
 * architecture.md#rate-limiting for the equivalent tradeoff on other
 * guards.
 *
 * TURNSTILE_SECRET_KEY has no documented default (unlike LOGIN_RATE_LIMIT_*)
 * because there isn't a safe fallback for a security-relevant secret —
 * local/sandbox dev should use Cloudflare's official always-passes test
 * secret key (1x0000000000000000000000000000000AA) rather than this
 * service silently no-op'ing when the env var is missing.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  async verify(token: string, remoteip?: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const secret = requireEnv('TURNSTILE_SECRET_KEY');

    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) {
      body.set('remoteip', remoteip);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TURNSTILE_REQUEST_TIMEOUT_MS,
    );

    try {
      const res = await fetch(TURNSTILE_SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.warn(
          `Turnstile siteverify returned ${res.status}; failing closed`,
        );
        return false;
      }

      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (err) {
      this.logger.warn(
        `Turnstile siteverify unreachable; failing closed: ${(err as Error).message}`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
