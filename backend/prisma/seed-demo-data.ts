import {
  Prisma,
  Role,
  TicketStatus,
  TicketPriority,
} from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../src/common/constants/auth.constants';
import {
  DEMO_USERS,
  DEMO_TICKETS,
  DEMO_MESSAGES,
  DEMO_PASSWORD,
  daysAgo,
} from '@helpdesk/shared';

/**
 * Inserts the demo fixture (packages/shared/src/demo-data/) via the given
 * Prisma client. Extracted out of seed.ts (Step 4.1.9) so Step 8.5's
 * scheduled demo-reset can insert byte-identical state through the same
 * code path instead of maintaining a second copy of this logic — one
 * inserts via the top-level PrismaClient (a fresh `prisma db seed`), the
 * other via an interactive-transaction client (AdminService.resetDemoData,
 * wrapped in the same $transaction as the preceding wipe). `Prisma.TransactionClient`
 * is the narrower of the two shapes; a plain PrismaClient satisfies it too,
 * so this one signature covers both callers.
 *
 * Batched via `createMany` (one round trip per model) rather than a
 * `for...of` + per-row `create()` loop -- the loop version meant 17
 * sequential round trips just for inserts (plus the 4 deleteMany calls
 * AdminService.resetDemoData runs first), which was enough to blow past
 * Prisma's default interactive-transaction timeout against a cold-started
 * Neon compute. See admin.constants.ts for the rest of that fix.
 *
 * `precomputedPasswordHash` lets a transactional caller (AdminService)
 * hash the shared demo password *before* opening the transaction --
 * bcrypt at cost 12 is CPU-bound and doesn't touch the database, so
 * hashing inside the transaction would burn part of its time budget for
 * no reason. `seed.ts` (not transactional, no timeout to protect) omits
 * it and this falls back to hashing inline, same as before.
 */
export async function seedDemoData(
  prisma: Prisma.TransactionClient,
  precomputedPasswordHash?: string,
) {
  const passwordHash =
    precomputedPasswordHash ??
    (await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS));

  await prisma.user.createMany({
    data: DEMO_USERS.map((user) => ({
      id: user.id,
      email: user.email,
      passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
    })),
  });

  await prisma.ticket.createMany({
    data: DEMO_TICKETS.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status as TicketStatus,
      priority: ticket.priority as TicketPriority,
      createdAt: daysAgo(ticket.createdDaysAgo),
      customerId: ticket.customerId,
      agentId: ticket.agentId,
      ...(ticket.closeReason !== undefined && {
        closeReason: ticket.closeReason,
        closedAt: daysAgo(ticket.closedDaysAgo as number),
        closedBy: ticket.closedBy,
      }),
    })),
  });

  await prisma.message.createMany({
    data: DEMO_MESSAGES.map((message) => ({
      id: message.id,
      ticketId: message.ticketId,
      senderId: message.senderId,
      content: message.content,
      isAiGenerated: message.isAiGenerated,
      createdAt: daysAgo(message.createdDaysAgo),
    })),
  });

  return {
    users: DEMO_USERS.length,
    tickets: DEMO_TICKETS.length,
    messages: DEMO_MESSAGES.length,
  };
}
