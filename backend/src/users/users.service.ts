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
import { PwnedPasswordService } from '../common/services/pwned-password.service';
import { WeakPasswordException } from '../common/exceptions/weak-password.exception';
import { USERS_ERRORS } from '../common/constants/error-messages.constants';
import { USERS_SUCCESS } from '../common/constants/success-messages.constants';
import { BCRYPT_SALT_ROUNDS } from '../common/constants/auth.constants';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private pwnedPasswords: PwnedPasswordService,
  ) {}

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
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);
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
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException(USERS_ERRORS.CURRENT_PASSWORD_INCORRECT);

    // Hard blocks (length, complexity, top-1000 list) already ran in the
    // DTO. This is a soft check: warn and require explicit confirmation,
    // but never block on the third-party API being unavailable.
    if (!dto.acknowledgeWeakPassword) {
      const isBreached = await this.pwnedPasswords.check(dto.newPassword);
      if (isBreached) throw new WeakPasswordException();
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

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

    return { message: USERS_SUCCESS.PASSWORD_UPDATED };
  }

  async changeEmail(
    userId: string,
    dto: ChangeEmailDto,
    currentRefreshTokenId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException(USERS_ERRORS.CURRENT_PASSWORD_INCORRECT);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.newEmail },
    });
    if (existing)
      throw new ConflictException(USERS_ERRORS.EMAIL_ALREADY_IN_USE);

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

    return { message: USERS_SUCCESS.EMAIL_UPDATED };
  }

  async deleteAccount(userId: string, currentPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException(USERS_ERRORS.CURRENT_PASSWORD_INCORRECT);

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

    return { message: USERS_SUCCESS.ACCOUNT_DELETED };
  }
}
