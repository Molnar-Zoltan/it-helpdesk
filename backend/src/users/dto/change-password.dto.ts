import { IsString, Length, IsOptional, IsBoolean } from 'class-validator';
import {
  NoEmoji,
  IsStrongPassword,
  IsNotCommonPassword,
} from '../../common/validators';

export class ChangePasswordDto {
  @IsString() currentPassword!: string;

  @IsString()
  @Length(8, 64)
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
