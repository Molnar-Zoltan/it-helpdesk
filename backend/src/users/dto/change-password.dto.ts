import { IsString, Length } from 'class-validator';
import { NoEmoji, IsStrongPassword, IsNotPwned } from '../../common/validators';

export class ChangePasswordDto {
  @IsString() currentPassword!: string;

  @IsString()
  @Length(8, 64)
  @NoEmoji()
  @IsStrongPassword()
  @IsNotPwned()
  newPassword!: string;
}
