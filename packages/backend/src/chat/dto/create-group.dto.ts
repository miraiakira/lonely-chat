import { IsArray, ArrayMinSize, IsInt, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateGroupDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  participantIds!: number[]
}