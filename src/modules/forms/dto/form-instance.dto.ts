import { FormInstanceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateFormInstanceDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(FormInstanceStatus)
  status?: FormInstanceStatus;

  @IsObject()
  data!: Record<string, unknown>;

  @IsDateString()
  deviceTimestamp!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientRevision?: number;
}

export class UpdateFormInstanceDto {
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(FormInstanceStatus)
  status?: FormInstanceStatus;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsDateString()
  deviceTimestamp!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientRevision?: number;
}

export class FormInstanceQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(FormInstanceStatus)
  status?: FormInstanceStatus;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}
