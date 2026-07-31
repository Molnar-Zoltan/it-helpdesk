import {
  PrismaClient,
  Role,
  TicketStatus,
  TicketPriority,
} from '../generated/prisma/client';
import type { Ticket } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../src/common/constants/auth.constants';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@helpdesk.dev',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const agent = await prisma.user.create({
    data: {
      email: 'agent@helpdesk.dev',
      passwordHash,
      firstName: 'Agent',
      lastName: 'Smith',
      role: Role.AGENT,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@helpdesk.dev',
      passwordHash,
      firstName: 'Casey',
      lastName: 'Customer',
      role: Role.CUSTOMER,
    },
  });

  // Spans all four statuses and a mix of priorities so pagination/sorting
  // (GET /tickets?sortBy=status|priority&...) has something real to sort.
  const ticketSeeds = [
    {
      title: 'Cannot log into VPN',
      description: 'Getting a timeout error since this morning.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
    },
    {
      title: "Laptop won't power on",
      description:
        'No response to the power button, tried a different outlet already.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.URGENT,
    },
    {
      title: 'Need software license renewal',
      description:
        'Design tool license expires end of month, requesting renewal.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.LOW,
    },
    {
      title: 'Printer offline on 3rd floor',
      description:
        'Shared printer shows offline in every app, restarted twice already.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
    },
    {
      title: 'Email sync failing on mobile',
      description:
        'Mobile client stopped syncing new mail as of yesterday afternoon.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
    },
    {
      title: 'Password reset for shared drive',
      description:
        'Locked out of the shared drive after a password policy change.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.LOW,
    },
    {
      title: 'Monitor flickering intermittently',
      description:
        'External monitor flickers a few times an hour, cable already reseated.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.MEDIUM,
    },
    {
      title: 'Onboarding laptop setup',
      description:
        'Initial laptop imaging and account setup for a new starter.',
      status: TicketStatus.CLOSED,
      priority: TicketPriority.MEDIUM,
    },
    {
      title: 'Access request for archived project',
      description:
        'Requesting read access to an archived project folder for a retro.',
      status: TicketStatus.CLOSED,
      priority: TicketPriority.LOW,
    },
  ];

  const tickets: Ticket[] = [];
  for (const seed of ticketSeeds) {
    const ticket = await prisma.ticket.create({
      data: { ...seed, customerId: customer.id, agentId: agent.id },
    });
    tickets.push(ticket);
  }

  await prisma.message.create({
    data: {
      ticketId: tickets[0].id,
      senderId: customer.id,
      content: 'Any update on this?',
    },
  });

  console.log({
    admin: admin.email,
    agent: agent.email,
    customer: customer.email,
    ticketCount: tickets.length,
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
