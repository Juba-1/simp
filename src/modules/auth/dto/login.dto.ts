import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email (admins) or username (field workers) */
  @IsString()
  @MinLength(3)
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
