import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateNameDto } from './dto/update-name.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('me')
  updateName(@Req() req: AuthenticatedRequest, @Body() dto: UpdateNameDto) {
    return this.usersService.updateName(req.user.userId, dto);
  }

  @Patch('me/password')
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      req.user.userId,
      dto,
      req.user.refreshTokenId,
    );
  }

  @Patch('me/email')
  changeEmail(@Req() req: AuthenticatedRequest, @Body() dto: ChangeEmailDto) {
    return this.usersService.changeEmail(
      req.user.userId,
      dto,
      req.user.refreshTokenId,
    );
  }

  @Delete('me')
  deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(
      req.user.userId,
      dto.currentPassword,
    );
  }
}
