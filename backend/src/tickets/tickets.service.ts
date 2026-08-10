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
import { FindTicketQueueDto } from './dto/find-ticket-queue.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TICKETS_ERRORS } from '../common/constants/error-messages.constants';
import type { PaginatedResult } from '@helpdesk/shared';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // Which statuses an agent/admin may move a ticket to, keyed by its
  // current status. Deliberately excludes self-transitions (e.g.
  // IN_PROGRESS -> IN_PROGRESS) so a repeat call with the same target
  // status is rejected outright rather than silently re-writing the row —
  // same reasoning as assignTicket's no-op short-circuit, just enforced by
  // the map instead of an extra check. CLOSED has no outgoing transitions
  // here: reopening a closed ticket stays customer-only, via the existing
  // PATCH /tickets/:id/reopen.
  private static readonly ALLOWED_AGENT_STATUS_TRANSITIONS: Record<
    TicketStatus,
    TicketStatus[]
  > = {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.OPEN,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
    [TicketStatus.CLOSED]: [],
  };

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

  /**
   * Shared visibility rule (Step 9.4) behind both findOneForUser and
   * assertCanAccessMessages: the owning customer; the ticket's assigned
   * agent, or any AGENT while it's still unassigned (so an agent can open
   * an unclaimed ticket to decide whether to take it); or an ADMIN,
   * unconditionally. This replaces the earlier "any AGENT/ADMIN" rule both
   * of those methods used from 9.1 through the GET /tickets/:id fix —
   * assignment has now had a full endpoint (9.1) and a queue to claim from
   * (9.3), so an agent peeking into a ticket assigned to someone else no
   * longer has a reason to.
   *
   * Deliberately NOT applied to findQueue: the queue is a browsing/index
   * view an agent needs to see broadly (including other agents' tickets)
   * to make sense of the board, understand load, or have an admin
   * reassign — narrowing the *list* the same way as a single ticket's
   * detail would make the queue useless for its actual purpose.
   */
  private canAccessTicket(
    ticket: Ticket,
    callerId: string,
    role: Role,
  ): boolean {
    if (ticket.customerId === callerId) {
      return true;
    }
    if (role === Role.ADMIN) {
      return true;
    }
    return (
      role === Role.AGENT &&
      (ticket.agentId === callerId || ticket.agentId === null)
    );
  }

  async findAllForUser(customerId: string, query: FindTicketsQueryDto) {
    return this.paginateTickets({ customerId }, query);
  }

  /**
   * Agent queue (Step 9.3) — the reuse paginateTickets was deliberately
   * structured for back in 4.1.4. Unscoped by default (no customerId, no
   * agentId), with optional status/priority/assignedTo filters layered on
   * top via the same `where` clause paginateTickets already accepts.
   *
   * Deliberately not scoped to the caller's own assigned tickets by
   * default, even after canAccessTicket narrowed single-ticket visibility
   * in Step 9.4 — the queue is what an agent uses to see the whole board
   * (including other agents' load) and find unclaimed work, so it stays
   * broad. Use `assignedTo=me` to see just your own.
   */
  async findQueue(
    callerId: string,
    query: FindTicketQueueDto,
  ): Promise<PaginatedResult<Ticket>> {
    const { status, priority, assignedTo, ...pagination } = query;

    const where: Prisma.TicketWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
    };

    if (assignedTo === 'me') {
      where.agentId = callerId;
    } else if (assignedTo === 'unassigned') {
      where.agentId = null;
    } else if (assignedTo) {
      where.agentId = assignedTo;
    }

    return this.paginateTickets(where, pagination);
  }

  /**
   * Shared query/sort/paginate logic behind a `where` scope. Kept private
   * since both callers (findAllForUser's `{ customerId }` scope, and
   * findQueue's unscoped/filtered one) live in this same class.
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

  /**
   * Visibility: see canAccessTicket. Agents could already list tickets
   * (queue) and act on them (assign, status), but this endpoint was still
   * unconditionally customer-only before the GET /tickets/:id fix, which
   * meant an agent could see a ticket in the queue yet not open its detail
   * page. Now narrowed alongside messages as of Step 9.4.
   */
  async findOneForUser(
    id: string,
    callerId: string,
    role: Role,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    // Same exception, same message for "doesn't exist" and "not yours" —
    // a 403 or a differently-worded 404 would leak whether the ticket ID
    // exists at all.
    if (!ticket || !this.canAccessTicket(ticket, callerId, role)) {
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

  /**
   * Agent-driven status transitions (Step 9.2). Kept as its own endpoint,
   * separate from assignTicket (9.1) and from the customer's narrow
   * close/reopen endpoints — this is the general status-update route for
   * OPEN/IN_PROGRESS/RESOLVED/agent-forced-CLOSED that close/reopen were
   * deliberately never meant to be.
   *
   * Permission model mirrors assignTicket's "claim it before you can work
   * it": only the ticket's assigned agent, or an ADMIN, may drive its
   * status. An unassigned ticket has no agent to authorize, so only ADMIN
   * can act on one directly (e.g. force-closing an obvious spam/duplicate
   * ticket without assigning it to anyone first). Failures are 403, same
   * reasoning as assignTicket: ticket existence isn't a secret from an
   * agent/admin.
   *
   * Forcing a ticket to CLOSED reuses the same closeReason/closedAt/
   * closedBy columns the customer close endpoint writes — one "closed"
   * record regardless of who closed it, rather than a parallel set of
   * agent-close fields.
   */
  async updateTicketStatus(
    ticketId: string,
    callerId: string,
    callerRole: Role,
    dto: UpdateTicketStatusDto,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    if (callerRole !== Role.ADMIN && ticket.agentId !== callerId) {
      throw new ForbiddenException(TICKETS_ERRORS.TICKET_NOT_ASSIGNED_TO_YOU);
    }

    const allowedTargets =
      TicketsService.ALLOWED_AGENT_STATUS_TRANSITIONS[ticket.status];
    if (!allowedTargets.includes(dto.status)) {
      throw new BadRequestException(TICKETS_ERRORS.INVALID_STATUS_TRANSITION);
    }

    if (dto.status === TicketStatus.CLOSED) {
      return this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CLOSED,
          closeReason: dto.reason,
          closedAt: new Date(),
          closedBy: callerId,
        },
      });
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: dto.status },
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
   * message thread — delegates to canAccessTicket (Step 9.4): the owning
   * customer; the assigned agent (or any agent while unassigned); or an
   * ADMIN. Same 404-not-403 pattern as the rest of this service: "doesn't
   * exist" and "not yours" look identical to the caller.
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

    if (!ticket || !this.canAccessTicket(ticket, userId, role)) {
      throw new NotFoundException(TICKETS_ERRORS.TICKET_NOT_FOUND);
    }

    return ticket;
  }
}
