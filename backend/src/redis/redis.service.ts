import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { requireEnv } from '../auth/token.util';

/**
 * Thin wrapper around a single ioredis client, shared by every consumer
 * (rate limiting today; AI daily-usage counters in Step 10). A plain TCP
 * connection via ioredis rather than Upstash's REST client, so the same
 * connection code works unchanged against the local Docker Redis container
 * and Upstash in production — just a different REDIS_URL
 * (redis://localhost:6379 locally, rediss://... on Upstash).
 *
 * Exposes the raw client rather than wrapping every Redis command, since
 * callers (RateLimitService) need real Redis primitives (INCR, EXPIRE, TTL)
 * rather than a leaky abstraction over them.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(requireEnv('REDIS_URL'), {
      // Cloud Run can scale to zero; don't let a cold-start's first Redis
      // command wait forever on a connection that failed to establish.
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
