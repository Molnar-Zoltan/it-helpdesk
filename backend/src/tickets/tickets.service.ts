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
  Message,
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
import {
  type PaginatedResult,
  TICKET_REOPEN_REASON_MIN_LENGTH,
  TICKET_REOPEN_REASON_MAX_LENGTH,
  containsEmoji,
} from '@helpdesk/shared';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // Which statuses an agent/admin may move a ticket to, keyed by its
  // current status. Deliberately excludes self-transitions (e.g.
  // IN_PROGRESS -> IN_PROGRESS) so a repeat call with the same target
  // status is rejected outright rather than silently re-writing the row —
  // same reasoning as assignTicket's no-op short-circuit, just enforced by
  // the map instead of an extra check. CLOSED's outgoing transitions
  // (OPEN, IN_PROGRESS) are an agent-driven reopen, handled by this same
  // endpoint rather than by PATCH /tickets/:id/reopen — that endpoint
  // stays customer-only and untouched; this is a parallel path for an
  // agent/admin who needs to reopen without the customer's involvement
  // (see updateTicketStatus below for how it's distinguished from every
  // other transition).
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
    [TicketStatus.CLOSED]: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
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

    // Step 9.5: resume IN_PROGRESS if the ticket still has an agent
    // attached, OPEN otherwise. A closed ticket keeps whatever agentId it
    // had at close time (closing doesn't unassign), so if that agent is
    // still on it, the ticket was actively being worked and reopening
    // should put it back in that state rather than dropping it back to
    // an unclaimed-looking OPEN the assigned agent would need to notice
    // and re-transition themselves. An unassigned ticket has no one to
    // resume work "in progress" for, so it goes to OPEN same as before.
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
        status: ticket.agentId ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN,
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
   * Agent-driven status transitions (Step 9.2), plus agent-driven reopen
   * (added afterward, once it became clear reopen shouldn't be
   * customer-exclusive — e.g. an agent who closed a ticket by mistake, or
   * needs to reactivate one a customer isn't available to reopen
   * themselves). Kept as its own endpoint, separate from assignTicket
   * (9.1) and from the customer's PATCH /tickets/:id/close and
   * PATCH /tickets/:id/reopen — this is the general status-update route
   * those two were deliberately never meant to be.
   *
   * Permission model mirrors assignTicket's "claim it before you can work
   * it": only the ticket's assigned agent, or an ADMIN, may drive its
   * status — including reopening it, since closing a ticket doesn't clear
   * agentId. An unassigned ticket has no agent to authorize, so only ADMIN
   * can act on one directly (e.g. force-closing an obvious spam/duplicate
   * ticket without assigning it to anyone first). Failures are 403, same
   * reasoning as assignTicket: ticket existence isn't a secret from an
   * agent/admin.
   *
   * Two of the four possible outcomes reuse the customer-facing columns
   * rather than writing a parallel set of agent-specific ones, so a
   * ticket's close/reopen history looks identical regardless of who
   * acted:
   * - Moving *to* CLOSED reuses closeReason/closedAt/closedBy — the same
   *   columns the customer close endpoint writes.
   * - Moving *out of* CLOSED (the ticket's current status is CLOSED, so
   *   the target — always OPEN or IN_PROGRESS per the transition map —
   *   is a reopen) reuses reopenReason/reopenedAt/reopenedBy — the same
   *   columns the customer reopen endpoint writes. A reason is required
   *   here exactly like it is for the customer-reopen and agent-close
   *   cases; the DTO can't enforce that itself since it only sees the
   *   target status, not the ticket's current one, so it's checked here
   *   once the ticket is loaded.
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

    // Only remaining way to reach this point with ticket.status ===
    // CLOSED is an agent-driven reopen — every other current status'
    // allowed targets exclude CLOSED as a *source*, only as a
    // destination (handled above). Reason is validated by hand here
    // (required, length-bounded, no emoji) with the same
    // TICKET_REOPEN_REASON_MIN/MAX_LENGTH bounds ReopenTicketDto enforces
    // via decorators — this path can't use decorators for it, since
    // whether a reason is even required depends on the ticket's current
    // status, which only the service (not the DTO) has loaded.
    if (ticket.status === TicketStatus.CLOSED) {
      if (!dto.reason) {
        throw new BadRequestException(TICKETS_ERRORS.REOPEN_REASON_REQUIRED);
      }
      if (
        dto.reason.length < TICKET_REOPEN_REASON_MIN_LENGTH ||
        dto.reason.length > TICKET_REOPEN_REASON_MAX_LENGTH
      ) {
        throw new BadRequestException(
          `Reason must be between ${TICKET_REOPEN_REASON_MIN_LENGTH} and ${TICKET_REOPEN_REASON_MAX_LENGTH} characters`,
        );
      }
      if (containsEmoji(dto.reason)) {
        throw new BadRequestException('Reason cannot contain emoji');
      }

      return this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: dto.status,
          reopenReason: dto.reason,
          reopenedAt: new Date(),
          reopenedBy: callerId,
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

    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        ticketId,
        senderId: userId,
        isAiGenerated: false,
      },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    return this.toMessageResponse(message, role);
  }

  async getMessages(ticketId: string, userId: string, role: Role) {
    await this.assertCanAccessMessages(ticketId, userId, role);

    // Status isn't checked here (unlike addMessage) -- reading a closed
    // ticket's thread should always work, only new writes are blocked.
    // Chronological (oldest first) — this is a conversation thread meant to
    // be read top-to-bottom, unlike the ticket list's newest-first default.
    const messages = await this.prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    return messages.map((message) => this.toMessageResponse(message, role));
  }

  /**
   * Flattens Prisma's nested `sender` relation into a plain `senderName`
   * string, matching this service's existing flat-DTO response shape
   * elsewhere (no other endpoint returns a nested object). `senderName` is
   * null exactly when `senderId` is null: either the message is AI-
   * generated (never had a sender), or the original sender's account was
   * later deleted (GDPR anonymization nulls senderId — see schema.md's
   * GDPR section) and content itself already reads as anonymized, so
   * losing the name here is consistent, not a new gap.
   *
   * Takes the *viewer's* role, not the sender's, to decide how much of the
   * name to reveal: a CUSTOMER sees only an agent's first name (matches
   * common helpdesk convention — Zendesk/Freshdesk do the same — an
   * agent's full legal name isn't something a customer needs to see, and
   * exposing it to someone who may be upset about how their ticket went
   * has little upside). An AGENT/ADMIN sees full names, since they need to
   * identify the customer and any other agent unambiguously. A ticket only
   * ever has one customer, so this only ever truncates an agent's name,
   * never the customer's own.
   */
  private toMessageResponse(
    message: Message & {
      sender: { firstName: string; lastName: string } | null;
    },
    viewerRole: Role,
  ) {
    const { sender, ...rest } = message;
    const senderName = sender
      ? viewerRole === Role.CUSTOMER
        ? sender.firstName
        : `${sender.firstName} ${sender.lastName}`
      : null;

    return { ...rest, senderName };
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
