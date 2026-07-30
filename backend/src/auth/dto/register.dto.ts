import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import {
  NoEmoji,
  IsValidName,
  IsStrongPassword,
  IsNotCommonPassword,
} from '../../common/validators';
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
} from '@helpdesk/shared';

export class RegisterDto {
  @IsEmail({ allow_display_name: false, require_tld: true })
  @MaxLength(EMAIL_MAX_LENGTH)
  @NoEmoji()
  email!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
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
  @Length(NAME_MIN_LENGTH, NAME_MAX_LENGTH)
  @IsValidName()
  firstName!: string;

  @IsString()
  @Length(NAME_MIN_LENGTH, NAME_MAX_LENGTH)
  @IsValidName()
  lastName!: string;
}
