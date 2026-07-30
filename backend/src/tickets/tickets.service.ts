import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

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
}
