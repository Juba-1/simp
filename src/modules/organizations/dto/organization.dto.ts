import { OrganizationType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class OrganizationDirectoryQueryDto {
  @IsEnum(OrganizationType)
  type!: OrganizationType;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsEnum(OrganizationType)
  type!: OrganizationType;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
