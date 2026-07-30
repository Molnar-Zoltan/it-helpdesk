import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(req.user.userId, dto);
  }
}
