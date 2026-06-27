import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isOrgAdmin?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isOrgAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Bulk-set which projects an org member is assigned to (the access matrix) */
export class SetMemberProjectsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  projectIds!: string[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export const FIELD_ACCOUNT_EMAIL_SUFFIX = '.simp.local';

export function buildFieldWorkerEmail(
  username: string,
  organizationId: string,
): string {
  return `${username.toLowerCase()}@${organizationId}.simp.local`;
}

export function isFieldWorkerEmail(email: string): boolean {
  return email.toLowerCase().endsWith(FIELD_ACCOUNT_EMAIL_SUFFIX);
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const space = trimmed.indexOf(' ');
  if (space === -1) {
    return { firstName: trimmed, lastName: '—' };
  }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
