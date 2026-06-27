import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitWorkflowDto {
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ApprovalDecisionDto {
  @IsOptional()
  @IsString()
  comments?: string;

  /** WIR internal approval — billable unit rate (QA/QC or org admin only). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lineAmount?: number;
}
