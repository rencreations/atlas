import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class LoginPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class LoginPassphraseDto {
  @IsString()
  @IsNotEmpty()
  passphrase!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 256)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;

  /** Set by the register form when the instance requires accepting the
   *  terms. Enforced server-side, see LocalAuthService.register. */
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}

export class MagicLinkRequestDto {
  @IsEmail()
  email!: string;
}

export class MagicLinkVerifyDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class PhoneOtpRequestDto {
  /** E.164, e.g. +15551234567 */
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be E.164 (+countrycode and number).' })
  phone!: string;

  @IsOptional()
  @IsIn(['login', 'verify-phone'])
  purpose?: 'login' | 'verify-phone';
}

export class LoginPhoneOtpDto {
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be E.164 (+countrycode and number).' })
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  @IsOptional()
  @IsIn(['login', 'verify-phone'])
  purpose?: 'login' | 'verify-phone';
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @Length(6, 256)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @Length(6, 256)
  newPassword!: string;
}

export { LoginDto } from './login.dto';
