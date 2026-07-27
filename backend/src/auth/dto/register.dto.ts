import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { NoEmoji, IsValidName } from '../../common/validators';

export class RegisterDto {
  @IsEmail({ allow_display_name: false, require_tld: true })
  @NoEmoji()
  email!: string;

  @IsString()
  @MinLength(8)
  @NoEmoji()
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
