import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export class CreateIpcDraftDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** If omitted, auto-aggregates ALL eligible approved unbilled WIRs */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  formInstanceIds?: string[];
}

export class CreateIpcWithWirsDto {
  @IsUUID()
  projectId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  formInstanceIds!: string[];

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class IpcDecisionDto {
  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
