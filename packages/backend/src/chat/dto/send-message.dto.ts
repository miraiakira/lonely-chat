import { IsInt, IsOptional, IsString, MinLength, IsArray } from 'class-validator'

export class SendMessageDto {
  @IsOptional()
  @IsInt()
  convId?: number

  @IsOptional()
  @IsInt()
  toUserId?: number

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}