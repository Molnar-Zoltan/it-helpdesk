import "dotenv/config";
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  const tickets = await prisma.ticket.findMany({ include: { messages: true } });

  console.log('Users:', users.map(u => ({ email: u.email, role: u.role })));
  console.log('Tickets:', JSON.stringify(tickets, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());