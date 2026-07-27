import { IsEmail, IsString, Length } from 'class-validator';
import {
  NoEmoji,
  IsValidName,
  IsStrongPassword,
  IsNotPwned,
} from '../../common/validators';

export class RegisterDto {
  @IsEmail({ allow_display_name: false, require_tld: true })
  @NoEmoji()
  email!: string;

  @IsString()
  @Length(8, 64)
  @NoEmoji()
  @IsStrongPassword()
  @IsNotPwned()
  password!: string;

  @IsString()
  @Length(1, 50)
  @IsValidName()
  firstName!: string;

  @IsString()
  @Length(1, 50)
  @IsValidName()
  lastName!: string;
}
