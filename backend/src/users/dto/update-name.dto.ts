import { IsOptional, IsString, Length } from 'class-validator';
import { IsValidName } from '../../common/validators';
import { NAME_MIN_LENGTH, NAME_MAX_LENGTH } from '@helpdesk/shared';

export class UpdateNameDto {
  @IsOptional()
  @IsString()
  @Length(NAME_MIN_LENGTH, NAME_MAX_LENGTH)
  @IsValidName()
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(NAME_MIN_LENGTH, NAME_MAX_LENGTH)
  @IsValidName()
  lastName?: string;
}
