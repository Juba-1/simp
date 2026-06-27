import { StandardFormCode } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FormFieldDefinitionDto {
  @IsString()
  key!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  labelAr?: string;
}

export class FormSchemaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDefinitionDto)
  fields!: FormFieldDefinitionDto[];
}

export class CreateFormTemplateDto {
  @IsUUID()
  projectId!: string;

  @IsEnum(StandardFormCode)
  code!: StandardFormCode;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsObject()
  schema!: FormSchemaDto;

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}

export class UpdateFormTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsObject()
  schema?: FormSchemaDto;

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PublishTemplateVersionDto {
  @IsObject()
  schema!: FormSchemaDto;

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}
