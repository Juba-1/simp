import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

const PLATFORM_ORG_TYPES = [
  'CLIENT',
  'CONSULTANT',
  'MAIN_CONTRACTOR',
  'LABORATORY',
] as const;

export class CreatePlatformOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsIn(PLATFORM_ORG_TYPES)
  type!: (typeof PLATFORM_ORG_TYPES)[number];

  @IsString()
  @MinLength(2)
  adminFullName!: string;

  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'Username must be 3–32 characters (letters, numbers, dots, underscores, hyphens)',
  })
  adminUsername!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}

export class UpdatePlatformOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;
}
