import { OrganizationType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @IsString()
  @MinLength(2)
  organizationName!: string;

  @IsOptional()
  @IsString()
  organizationNameAr?: string;

  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;
}
