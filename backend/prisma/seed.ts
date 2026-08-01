import {
  PrismaClient,
  Role,
  TicketStatus,
  TicketPriority,
} from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../src/common/constants/auth.constants';
import {
  DEMO_USERS,
  DEMO_TICKETS,
  DEMO_MESSAGES,
  DEMO_PASSWORD,
  daysAgo,
} from '@helpdesk/shared';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seed data itself now lives in packages/shared/src/demo-data/ — the same
// fixture the frontend's planned MSW offline-mode handlers will serve
// directly, so the demo looks identical whether the real backend is up or
// not. This file's job is just to insert it: hash the shared plaintext
// password, and resolve each record's relative `daysAgo` offsets into real
// Dates via the shared `daysAgo()` helper.
async function main() {
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

  console.log({
    users: DEMO_USERS.length,
    tickets: DEMO_TICKETS.length,
    messages: DEMO_MESSAGES.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
