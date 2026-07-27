import {
  IsEmail,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import {
  NoEmoji,
  IsValidName,
  IsStrongPassword,
  IsNotCommonPassword,
} from '../../common/validators';

export class RegisterDto {
  @IsEmail({ allow_display_name: false, require_tld: true })
  @NoEmoji()
  email!: string;

  @IsString()
  @Length(8, 64)
  @NoEmoji()
  @IsStrongPassword()
  @IsNotCommonPassword()
  password!: string;

  // Set to true to proceed after being warned the password appeared in a
  // known data breach (see WeakPasswordException / PwnedPasswordService).
  @IsOptional()
  @IsBoolean()
  acknowledgeWeakPassword?: boolean;

  @IsString()
  @Length(1, 50)
  @IsValidName()
  firstName!: string;

  @IsString()
  @Length(1, 50)
  @IsValidName()
  lastName!: string;
}
