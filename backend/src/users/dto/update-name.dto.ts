import { IsOptional, IsString, Length } from 'class-validator';
import { IsValidName } from '../../common/validators';

export class UpdateNameDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @IsValidName()
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @IsValidName()
  lastName?: string;
}
