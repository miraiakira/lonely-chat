import { IsArray, IsOptional, IsString, MinLength } from 'class-validator'

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}