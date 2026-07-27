import { IsString, MinLength } from 'class-validator';
import { NoEmoji } from '../../common/validators';

export class ChangePasswordDto {
  @IsString() currentPassword!: string;

  @IsString()
  @MinLength(8)
  @NoEmoji()
  newPassword!: string;
}
