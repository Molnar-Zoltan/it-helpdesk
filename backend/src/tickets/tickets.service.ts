import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TICKETS_ERRORS } from '../common/constants/error-messages.constants';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(customerId: string, dto: CreateTicketDto) {
    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        ...(dto.priority && { priority: dto.priority }),
        customerId,
      },
    });
  }

  async findAllForUser(customerId: string) {
    return this.prisma.ticket.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, customerId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    // Same exception, same message for "doesn't exist" and "not yours" —
    // a 403 or a differently-worded 404 would leak whether the ticket ID
    // exists at all.
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    return ticket;
  }
}
