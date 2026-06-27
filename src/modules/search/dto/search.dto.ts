import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { FormInstanceStatus, StandardFormCode } from '@prisma/client';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(StandardFormCode)
  formCode?: StandardFormCode;

  @IsOptional()
  @IsEnum(FormInstanceStatus)
  status?: FormInstanceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
