import { ProjectOrganizationRole, ProjectStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

/** Org types a Client can directly provision as a project vendor */
export const VENDOR_ORG_TYPES = [
  'CONSULTANT',
  'MAIN_CONTRACTOR',
  'LABORATORY',
] as const;
export type VendorOrgType = (typeof VENDOR_ORG_TYPES)[number];

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsString()
  @MinLength(2)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class InviteProjectOrganizationDto {
  @IsUUID()
  organizationId!: string;

  @IsEnum(ProjectOrganizationRole)
  role!: ProjectOrganizationRole;
}

export class InviteSubContractorDto {
  @IsUUID()
  subContractorOrgId!: string;
}

/** Assign one of the org's own users to a project (the access matrix) */
export class AssignProjectUserDto {
  @IsUUID()
  userId!: string;
}

/** Client provisions a brand-new vendor org + its first admin, linked to the project */
export class OnboardVendorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsIn(VENDOR_ORG_TYPES)
  type!: VendorOrgType;

  @IsString()
  @MinLength(2)
  adminFullName!: string;

  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens',
  })
  adminUsername!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}

/** Main Contractor provisions a sub-contractor org + admin linked to a project */
export class ProvisionSubContractorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsString()
  @MinLength(2)
  adminFullName!: string;

  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens',
  })
  adminUsername!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}
