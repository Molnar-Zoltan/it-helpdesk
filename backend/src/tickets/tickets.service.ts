import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  Ticket,
  TicketStatus,
  Role,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { TICKETS_ERRORS } from '../common/constants/error-messages.constants';
import { PaginatedResult } from '../common/types/paginated-result.type';

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

  async findAllForUser(customerId: string, query: FindTicketsQueryDto) {
    return this.paginateTickets({ customerId }, query);
  }

  /**
   * Shared query/sort/paginate logic behind a `where` scope. Kept private
   * for now — Step 7's agent queue is expected to call into this with an
   * unscoped (or agent/status-scoped) `where` instead of `{ customerId }`.
   */
  private async paginateTickets(
    where: Prisma.TicketWhereInput,
    query: FindTicketsQueryDto,
  ): Promise<PaginatedResult<Ticket>> {
    const { page, limit, sortBy, sortOrder } = query;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
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

  async closeTicket(id: string, customerId: string, dto: CloseTicketDto) {
    // Same lookup + ownership check as findOneForUser: 404 (not 403) for
    // both "doesn't exist" and "not yours", so ticket existence isn't leaked.
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    // Closing only ever moves a ticket toward CLOSED. Already-CLOSED is
    // rejected rather than silently succeeding, so a second close attempt
    // (e.g. a double-click) surfaces instead of quietly overwriting the
    // original close reason/timestamp.
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(TICKETS_ERRORS.TICKET_ALREADY_CLOSED);
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
        closeReason: dto.reason,
        closedAt: new Date(),
        closedBy: customerId,
      },
    });
  }

  async addMessage(
    ticketId: string,
    userId: string,
    role: Role,
    dto: CreateMessageDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    // Visibility: the owning customer, or any AGENT/ADMIN. Agent-ticket
    // assignment doesn't exist yet (Step 7), so this deliberately does NOT
    // scope to a specific assigned agent — any agent can comment on any
    // ticket for now. Revisit once assignment exists and narrow this to
    // "assigned agent (or unassigned) + ADMIN", matching how findOneForUser
    // will likely need to evolve for the agent queue.
    const isOwningCustomer = ticket?.customerId === userId;
    const isAgentOrAdmin = role === Role.AGENT || role === Role.ADMIN;

    if (!ticket || !(isOwningCustomer || isAgentOrAdmin)) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    return this.prisma.message.create({
      data: {
        content: dto.content,
        ticketId,
        senderId: userId,
        isAiGenerated: false,
      },
    });
  }
}
