import { IsString, Length, IsOptional, IsBoolean } from 'class-validator';
import {
  NoEmoji,
  IsStrongPassword,
  IsNotCommonPassword,
} from '../../common/validators';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@helpdesk/shared';

export class ChangePasswordDto {
  @IsString() currentPassword!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  @NoEmoji()
  @IsStrongPassword()
  @IsNotCommonPassword()
  newPassword!: string;

  // Set to true to proceed after being warned the password appeared in a
  // known data breach (see WeakPasswordException / PwnedPasswordService).
  @IsOptional()
  @IsBoolean()
  acknowledgeWeakPassword?: boolean;
}
