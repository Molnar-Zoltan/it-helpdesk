import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken, requireEnv } from './token.util';
import { PwnedPasswordService } from '../common/services/pwned-password.service';
import { WeakPasswordException } from '../common/exceptions/weak-password.exception';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private pwnedPasswords: PwnedPasswordService,
  ) {}

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    acknowledgeWeakPassword = false,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    // Hard blocks (length, complexity, top-1000 list) already ran in the DTO.
    // This is a soft check: warn and require explicit confirmation, but
    // never block on the third-party API being unavailable.
    if (!acknowledgeWeakPassword) {
      const isBreached = await this.pwnedPasswords.check(password);
      if (isBreached) throw new WeakPasswordException();
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, firstName, lastName },
    });
    return this.issueTokens(user.id, user.role);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueTokens(user.id, user.role);
  }

  async issueTokens(userId: string, role: string) {
    // Sign the refresh token first — its own payload doesn't need the row id
    const refreshToken = this.jwt.sign(
      { sub: userId },
      { secret: requireEnv('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );

    // Create the RefreshToken row BEFORE signing the access token,
    // so we have a row id to embed in the access token payload
    const refreshTokenRow = await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.jwt.sign(
      { sub: userId, role, refreshTokenId: refreshTokenRow.id },
      { secret: requireEnv('JWT_SECRET'), expiresIn: '15m' },
    );

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: requireEnv('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }
}
