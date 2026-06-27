import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormInstanceStatus, SyncActionType } from '@prisma/client';

export class SyncFormInstancePayloadDto {
  @IsOptional()
  @IsUUID()
  id?: string;

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

export class SyncActionDto {
  @IsString()
  clientActionId!: string;

  @IsEnum(SyncActionType)
  type!: SyncActionType;

  @IsUUID()
  entityId!: string;

  @IsDateString()
  deviceTimestamp!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SyncFormInstancePayloadDto)
  payload?: SyncFormInstancePayloadDto;

  @IsOptional()
  @IsUUID()
  fileAttachmentId?: string;
}

export class SyncBatchDto {
  @IsUUID()
  batchId!: string;

  @IsOptional()
  @IsString()
  clientDeviceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActionDto)
  actions!: SyncActionDto[];
}

export class SyncPullQueryDto {
  @IsOptional()
  @IsDateString()
  since?: string;
}
