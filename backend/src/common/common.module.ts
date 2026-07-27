import { Global, Module } from '@nestjs/common';
import { PwnedPasswordService } from './services/pwned-password.service';

@Global()
@Module({
  providers: [PwnedPasswordService],
  exports: [PwnedPasswordService],
})
export class CommonModule {}
