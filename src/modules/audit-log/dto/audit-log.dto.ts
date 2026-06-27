import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { AuditSource } from '@prisma/client';

export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditSource)
  source?: AuditSource;

  @IsOptional()
  @IsString()
  action?: string;

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
  limit?: number = 50;
}
