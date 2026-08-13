import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { seedDemoData } from '../../prisma/seed-demo-data';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Wipes every row in the database and re-inserts the demo fixture, in a
   * single transaction so a caller never observes a half-empty database
   * mid-reset. Full wipe, not a diff against seed state — this project's
   * demo accounts aren't blocked from creating/closing/reopening tickets
   * or posting messages (only the four `/users/me` self-service mutations
   * are), so real accounts and ticket data can also accumulate on the live
   * demo over time; a partial reset would leave those behind.
   *
   * Deletion order respects FK direction (children before parents):
   * Message/RefreshToken/AiUsage all reference User or Ticket, which must
   * go last. seedDemoData (Step 4.1.9's extracted insert logic)
   * then re-creates the same fixture `prisma db seed` does, so a reset
   * produces byte-identical state to a fresh seed.
   */
  async resetDemoData() {
    const counts = await this.prisma.$transaction(async (tx) => {
      await tx.message.deleteMany();
      await tx.ticket.deleteMany();
      await tx.refreshToken.deleteMany();
      await tx.aiUsage.deleteMany();
      await tx.user.deleteMany();

      return seedDemoData(tx);
    });

    this.logger.log(`Demo data reset: ${JSON.stringify(counts)}`);
    return counts;
  }
}
