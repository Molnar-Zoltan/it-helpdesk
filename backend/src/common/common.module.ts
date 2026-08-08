import { Global, Module } from '@nestjs/common';
import { PwnedPasswordService } from './services/pwned-password.service';
import { RateLimitService } from './services/rate-limit.service';
import { TurnstileService } from './services/turnstile.service';

@Global()
@Module({
  providers: [PwnedPasswordService, RateLimitService, TurnstileService],
  exports: [PwnedPasswordService, RateLimitService, TurnstileService],
})
export class CommonModule {}
