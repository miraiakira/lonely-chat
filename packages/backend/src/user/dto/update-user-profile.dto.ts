import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}