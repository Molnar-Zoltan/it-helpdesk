import { Global, Module } from '@nestjs/common';
import { PwnedPasswordService } from './services/pwned-password.service';
import { RateLimitService } from './services/rate-limit.service';
import { TurnstileService } from './services/turnstile.service';
import { SessionRevocationService } from './services/session-revocation.service';

@Global()
@Module({
  providers: [
    PwnedPasswordService,
    RateLimitService,
    TurnstileService,
    SessionRevocationService,
  ],
  exports: [
    PwnedPasswordService,
    RateLimitService,
    TurnstileService,
    SessionRevocationService,
  ],
})
export class CommonModule {}
