import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { AssignTicketDto } from './dto/assign-ticket.dto';
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
   * for now — Step 9's agent queue is expected to call into this with an
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

    // Always resets to OPEN rather than IN_PROGRESS, even now that
    // assignment (Step 9.1) exists — a closed ticket keeps whatever
    // agentId it had, so a reopen *could* arguably resume as IN_PROGRESS
    // when an agent is still attached. Left as OPEN for now and tracked as
    // a Step 9.5 follow-up rather than folded in here, to keep this patch
    // scoped to reopen's existing behavior.
    //
    // closeReason/closedAt/closedBy are deliberately left untouched: they
    // stay as a historical record of the prior close rather than being
    // cleared, since reopening doesn't erase that it *was* closed once.
    //
    // reopenReason/reopenedAt/reopenedBy follow the same single-snapshot
    // pattern as the close fields — a repeat close/reopen cycle overwrites
    // the previous reopen record rather than preserving full history. See
    // the optional TicketStatusChange-table upgrade noted for Step 9 if
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

  /**
   * Ticket assignment (Step 9.1). Deliberately its own narrow endpoint,
   * same reasoning as close/reopen: this only ever touches `agentId`, not
   * `status` — an explicit agent-driven status transition (Step 9.2) is a
   * separate action from claiming a ticket.
   *
   * Permission model:
   *  - Unscoped lookup (not customer-scoped) since any AGENT/ADMIN is
   *    allowed to see and act on any ticket here — unlike the customer
   *    endpoints, there's no ownership check to enforce via 404.
   *  - Any AGENT can self-assign an unassigned ticket (`agentId` omitted
   *    from the body defaults to the caller). Claiming from the queue
   *    shouldn't need a gatekeeper.
   *  - Only ADMIN may name a *different* agent in the body, and only ADMIN
   *    may reassign a ticket that already has an agent — taking a ticket
   *    away from whoever has it is a supervisory action, not a self-serve
   *    one. Failures here are 403, not 404: the ticket's existence isn't a
   *    secret from an agent/admin the way it is from another customer.
   */
  async assignTicket(
    ticketId: string,
    callerId: string,
    callerRole: Role,
    dto: AssignTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    const targetAgentId = dto.agentId ?? callerId;

    if (callerRole !== Role.ADMIN && targetAgentId !== callerId) {
      throw new ForbiddenException(TICKETS_ERRORS.CANNOT_ASSIGN_OTHER_AGENT);
    }

    if (
      ticket.agentId &&
      ticket.agentId !== targetAgentId &&
      callerRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(TICKETS_ERRORS.TICKET_ALREADY_ASSIGNED);
    }

    // Already assigned to this exact agent — nothing to change. Return as-is
    // rather than issuing a redundant UPDATE: Prisma's @updatedAt fires on
    // any write regardless of whether a field's value actually changed, so
    // skipping this avoids letting repeated self-assign calls bump the
    // ticket's updatedAt and quietly climb the queue's default sort order.
    // Skipped before the target-agent lookup below too, since there's
    // nothing left to validate when nothing is changing.
    if (ticket.agentId === targetAgentId) {
      return ticket;
    }

    const targetAgent = await this.prisma.user.findUnique({
      where: { id: targetAgentId },
    });
    if (
      !targetAgent ||
      (targetAgent.role !== Role.AGENT && targetAgent.role !== Role.ADMIN)
    ) {
      throw new BadRequestException(TICKETS_ERRORS.AGENT_NOT_FOUND);
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { agentId: targetAgentId },
    });
  }

  async addMessage(
    ticketId: string,
    userId: string,
    role: Role,
    dto: CreateMessageDto,
  ) {
    const ticket = await this.assertCanAccessMessages(ticketId, userId, role);

    // Posting is blocked once a ticket is CLOSED -- a closed ticket isn't
    // being actively worked, so a new message would silently sit unread
    // until someone reopens it anyway. Reading the existing thread
    // (getMessages) is unaffected; only new writes are blocked.
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        TICKETS_ERRORS.TICKET_CLOSED_CANNOT_MESSAGE,
      );
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

  async getMessages(ticketId: string, userId: string, role: Role) {
    await this.assertCanAccessMessages(ticketId, userId, role);

    // Status isn't checked here (unlike addMessage) -- reading a closed
    // ticket's thread should always work, only new writes are blocked.
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
   * assignment now exists (Step 9.1), but this deliberately still does NOT
   * scope to a specific assigned agent — any agent can read/comment on any
   * ticket for now. Narrowing this to "assigned agent (or unassigned) +
   * ADMIN" is tracked as Step 9.4, done as its own patch rather than
   * bundled with assignment itself. Same 404-not-403
   * pattern as the rest of this service: "doesn't exist" and "not yours"
   * look identical to the caller.
   *
   * Returns the ticket (rather than just throwing/void) so addMessage can
   * inspect its status for the closed-ticket guard above without a second
   * query.
   */
  private async assertCanAccessMessages(
    ticketId: string,
    userId: string,
    role: Role,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    const isOwningCustomer = ticket?.customerId === userId;
    const isAgentOrAdmin = role === Role.AGENT || role === Role.ADMIN;

    if (!ticket || !(isOwningCustomer || isAgentOrAdmin)) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    return ticket;
  }
}
