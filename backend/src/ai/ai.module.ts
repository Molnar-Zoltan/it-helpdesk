import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiClient } from './gemini/gemini.client';
import { TicketsModule } from '../tickets/tickets.module';

// PrismaModule, RedisModule, and CommonModule (RateLimitService) are all
// @Global(), so they don't need to be imported here explicitly -- only
// TicketsModule, whose TicketsService this module reuses for the
// create_ticket tool call (Step 10.3).
@Module({
  imports: [TicketsModule],
  controllers: [AiController],
  providers: [AiService, GeminiClient],
})
export class AiModule {}
