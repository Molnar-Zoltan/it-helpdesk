import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust exactly one hop: Cloud Run's Google Front End, which sits
  // directly in front of the container and appends the real connecting
  // client's IP as the rightmost entry of X-Forwarded-For after receipt —
  // that entry can't be spoofed by the caller. With trust proxy = 1,
  // Express's req.ip resolves to that rightmost trusted-appended address
  // rather than the (attacker-controllable) leftmost entry. Needed for
  // Step 6's IP-based login rate limiting to key on a real client IP
  // instead of the connecting proxy's own address.
  // INestApplication doesn't expose `set()` directly — go through the
  // underlying Express instance.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', 1);

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    // The `cors` package treats an undefined `origin` as "allow any origin"
    // (it falls into the same branch as an explicit '*'), not "reject" — so a
    // dropped/misconfigured FRONTEND_URL would silently open CORS wide rather
    // than failing. Fail fast at boot instead of degrading into a permissive
    // default that's easy to miss in a Cloud Run env var mix-up.
    throw new Error(
      'FRONTEND_URL is not set — refusing to start with an unconfigured CORS origin.',
    );
  }
  app.enableCors({ origin: frontendUrl, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}

void bootstrap();
