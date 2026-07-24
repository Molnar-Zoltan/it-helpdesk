import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateNameDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;
}