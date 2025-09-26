import { IsNotEmpty, IsString, MaxLength, IsOptional, IsInt, Min } from 'class-validator'

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  parentCommentId?: number
}