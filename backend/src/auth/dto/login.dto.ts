import { IsEmail, IsString, MaxLength } from 'class-validator';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '@helpdesk/shared';

export class LoginDto {
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
