import { Global, Module } from '@nestjs/common';
import { PwnedPasswordService } from './services/pwned-password.service';
import { RateLimitService } from './services/rate-limit.service';

@Global()
@Module({
  providers: [PwnedPasswordService, RateLimitService],
  exports: [PwnedPasswordService, RateLimitService],
})
export class CommonModule {}
