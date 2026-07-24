import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNameDto } from './dto/update-name.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateName(userId: string, dto: UpdateNameDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshTokenId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId,
          id: { not: currentRefreshTokenId },
          revoked: false,
        },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Password updated' };
  }

  async changeEmail(
    userId: string,
    dto: ChangeEmailDto,
    currentRefreshTokenId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.newEmail },
    });
    if (existing) throw new ConflictException('Email already in use');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: dto.newEmail },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId,
          id: { not: currentRefreshTokenId },
          revoked: false,
        },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Email updated' };
  }

  async deleteAccount(userId: string, currentPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    await this.prisma.$transaction([
      // Anonymize this user's messages before the FK is nulled
      this.prisma.message.updateMany({
        where: { senderId: userId },
        data: { content: '[deleted user]' },
      }),
      // RefreshToken rows cascade automatically via onDelete: Cascade
      // Ticket.customerId / Ticket.agentId / Message.senderId set null via onDelete: SetNull
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { message: 'Account deleted' };
  }
}