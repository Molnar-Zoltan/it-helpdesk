import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService],
  // Exported so AiModule (Step 10.3) can reuse the exact same
  // TicketsService.create() the manual form goes through, rather than a
  // parallel AI-only creation path -- see architecture.md's "Ticket
  // creation flow".
  exports: [TicketsService],
})
export class TicketsModule {}
