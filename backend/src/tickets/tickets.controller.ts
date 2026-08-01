import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindTicketsQueryDto,
  ) {
    return this.ticketsService.findAllForUser(req.user.userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ticketsService.findOneForUser(id, req.user.userId);
  }

  @Patch(':id/close')
  close(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CloseTicketDto,
  ) {
    return this.ticketsService.closeTicket(id, req.user.userId, dto);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMessageDto,
  ) {
    return this.ticketsService.addMessage(
      id,
      req.user.userId,
      req.user.role as Role,
      dto,
    );
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ticketsService.getMessages(
      id,
      req.user.userId,
      req.user.role as Role,
    );
  }
}
