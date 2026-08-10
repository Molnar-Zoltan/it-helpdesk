import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedDemoData } from './seed-demo-data';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seed data itself lives in packages/shared/src/demo-data/ — the same
// fixture the frontend's planned MSW offline-mode handlers will serve
// directly, so the demo looks identical whether the real backend is up or
// not. The actual insert logic lives in ./seed-demo-data.ts (Step 8.5),
// shared with AdminService.resetDemoData so a fresh `prisma db seed` and a
// scheduled demo-reset can never drift apart. This file's job is just to
// run it against a top-level PrismaClient and report what was inserted.
async function main() {
  const counts = await seedDemoData(prisma);
  console.log(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
