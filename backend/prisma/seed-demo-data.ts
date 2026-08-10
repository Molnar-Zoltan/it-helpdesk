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
 */
export async function seedDemoData(prisma: Prisma.TransactionClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  for (const user of DEMO_USERS) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as Role,
      },
    });
  }

  for (const ticket of DEMO_TICKETS) {
    await prisma.ticket.create({
      data: {
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
      },
    });
  }

  for (const message of DEMO_MESSAGES) {
    await prisma.message.create({
      data: {
        id: message.id,
        ticketId: message.ticketId,
        senderId: message.senderId,
        content: message.content,
        isAiGenerated: message.isAiGenerated,
        createdAt: daysAgo(message.createdDaysAgo),
      },
    });
  }

  return {
    users: DEMO_USERS.length,
    tickets: DEMO_TICKETS.length,
    messages: DEMO_MESSAGES.length,
  };
}
