import { PrismaClient, Role, TicketStatus, TicketPriority } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@helpdesk.dev', passwordHash, firstName: 'Admin', lastName: 'User' },
  });

  const agent = await prisma.user.create({
    data: { email: 'agent@helpdesk.dev', passwordHash, firstName: 'Agent', lastName: 'Smith', role: Role.AGENT },
  });

  const customer = await prisma.user.create({
    data: { email: 'customer@helpdesk.dev', passwordHash, firstName: 'Casey', lastName: 'Customer', role: Role.CUSTOMER },
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: 'Cannot log into VPN',
      description: 'Getting a timeout error since this morning.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      customerId: customer.id,
      agentId: agent.id,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket.id,
      senderId: customer.id,
      content: 'Any update on this?',
    },
  });

  console.log({ admin: admin.email, agent: agent.email, customer: customer.email, ticket: ticket.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });