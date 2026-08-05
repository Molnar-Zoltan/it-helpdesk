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
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { TICKETS_ERRORS } from '../common/constants/error-messages.constants';
import type { PaginatedResult } from '@helpdesk/shared';

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

  async reopenTicket(id: string, customerId: string, dto: ReopenTicketDto) {
    // Same lookup + ownership check as closeTicket/findOneForUser: 404
    // (not 403) for both "doesn't exist" and "not yours".
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    // Reopen is only valid from CLOSED — symmetric to close only being
    // valid *toward* CLOSED. Anything else (OPEN, IN_PROGRESS, RESOLVED)
    // isn't "closed" so there's nothing to reopen.
    if (ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException(TICKETS_ERRORS.TICKET_NOT_CLOSED);
    }

    // Always resets to OPEN rather than IN_PROGRESS. Today no ticket can
    // have an agentId set (assignment doesn't exist until Step 7), so OPEN
    // is unambiguous. Once assignment ships, a ticket that already had an
    // agent assigned before it was closed might arguably deserve to come
    // back as IN_PROGRESS instead — revisit then.
    //
    // closeReason/closedAt/closedBy are deliberately left untouched: they
    // stay as a historical record of the prior close rather than being
    // cleared, since reopening doesn't erase that it *was* closed once.
    //
    // reopenReason/reopenedAt/reopenedBy follow the same single-snapshot
    // pattern as the close fields — a repeat close/reopen cycle overwrites
    // the previous reopen record rather than preserving full history. See
    // the optional TicketStatusChange-table upgrade noted for Step 7/8 if
    // that turns out to matter in practice.
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.OPEN,
        reopenReason: dto.reason,
        reopenedAt: new Date(),
        reopenedBy: customerId,
      },
    });
  }

  async addMessage(
    ticketId: string,
    userId: string,
    role: Role,
    dto: CreateMessageDto,
  ) {
    await this.assertCanAccessMessages(ticketId, userId, role);

    return this.prisma.message.create({
      data: {
        content: dto.content,
        ticketId,
        senderId: userId,
        isAiGenerated: false,
      },
    });
  }

  async getMessages(ticketId: string, userId: string, role: Role) {
    await this.assertCanAccessMessages(ticketId, userId, role);

    // Chronological (oldest first) — this is a conversation thread meant to
    // be read top-to-bottom, unlike the ticket list's newest-first default.
    return this.prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Shared visibility check for both reading and writing a ticket's
   * message thread: the owning customer, or any AGENT/ADMIN. Agent-ticket
   * assignment doesn't exist yet (Step 7), so this deliberately does NOT
   * scope to a specific assigned agent — any agent can read/comment on any
   * ticket for now. Revisit once assignment exists and narrow this to
   * "assigned agent (or unassigned) + ADMIN", matching how findOneForUser
   * will likely need to evolve for the agent queue. Same 404-not-403
   * pattern as the rest of this service: "doesn't exist" and "not yours"
   * look identical to the caller.
   */
  private async assertCanAccessMessages(
    ticketId: string,
    userId: string,
    role: Role,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    const isOwningCustomer = ticket?.customerId === userId;
    const isAgentOrAdmin = role === Role.AGENT || role === Role.ADMIN;

    if (!ticket || !(isOwningCustomer || isAgentOrAdmin)) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }
  }
}
