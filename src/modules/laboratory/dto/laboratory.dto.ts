import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { LabTestResultStatus } from '@prisma/client';

export class CreateLabTestRequestDto {
  @IsUUID()
  formInstanceId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  testType?: string;
}

export class SubmitLabTestResultDto {
  @IsEnum(LabTestResultStatus)
  resultStatus!: LabTestResultStatus;

  @IsObject()
  metrics!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reportNotes?: string;
}
