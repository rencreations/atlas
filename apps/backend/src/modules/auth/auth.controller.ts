import { Body, Controller, Delete, Get, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { LocalAuthService } from './local-auth.service';
import { SessionService } from './session.service';
import { KeycloakTokenService } from './keycloak-token.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  InviteCheckDto,
  LoginDto,
  LoginPasswordDto,
  LoginPassphraseDto,
  LoginPhoneOtpDto,
  MagicLinkRequestDto,
  MagicLinkVerifyDto,
  PhoneOtpRequestDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly local: LocalAuthService,
    private readonly keycloakTokens: KeycloakTokenService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a session after successful Keycloak authentication (legacy
   * labmgm flow). The frontend calls this after Keycloak redirects back
   * with tokens.
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Create a session from Keycloak tokens (legacy flow)' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    try {
      this.logger.log('Keycloak login request received', {
        keycloakId: dto.keycloakId,
        email: dto.email,
      });

      const verifyTokens = this.config.get<boolean>('auth.verifyTokens') ?? true;
      let user: AuthenticatedUser;
      if (verifyTokens && this.keycloakTokens.isConfigured()) {
        // Identity comes from the cryptographically verified token, never
        // from the request body. The body fields are cosmetic fallbacks.
        const claims = await this.keycloakTokens.verifyLoginTokens(dto);
        if (dto.keycloakId !== claims.sub) {
          this.logger.warn('Client-supplied keycloakId differs from verified token subject', {
            supplied: dto.keycloakId,
            verified: claims.sub,
          });
        }
        if (!claims.name && !claims.given_name && !claims.preferred_username && dto.name) {
          claims.name = dto.name;
        }
        user = await this.authService.syncUserFromToken(claims);
      } else {
        if (verifyTokens) {
          // Verification enabled but Keycloak not configured, reject
          // rather than fall back to trusting the client.
          throw new Error('Keycloak is not configured on this instance.');
        }
        this.logger.warn(
          'AUTH_VERIFY_TOKENS=false, accepting unverified identity claims (emergency mode)',
        );
        user = await this.authService.syncUserFromTokenData(dto);
      }
      this.logger.log('User synced', { userId: user.id });

      return this.authService.issueSession(
        user,
        {
          method: 'keycloak',
          accessToken: dto.accessToken,
          refreshToken: dto.refreshToken,
          idToken: dto.idToken,
        },
        req,
      );
    } catch (error) {
      this.logger.error('Keycloak login failed', error);
      throw error;
    }
  }

  // ─── Local auth methods (self-host) ───────────────────────────────

  @Public()
  @Post('login/password')
  @ApiOperation({ summary: 'Sign in with email + password' })
  async loginWithPassword(@Body() dto: LoginPasswordDto, @Req() req: Request) {
    const { user, mustChangePassword } = await this.local.loginWithPassword(
      dto.email,
      dto.password,
    );
    const session = await this.authService.issueSession(user, { method: 'password' }, req);
    return { ...session, mustChangePassword };
  }

  @Public()
  @Post('login/passphrase')
  @ApiOperation({ summary: 'Sign in with the instance passphrase' })
  async loginWithPassphrase(@Body() dto: LoginPassphraseDto, @Req() req: Request) {
    const user = await this.local.loginWithPassphrase(dto.passphrase);
    return this.authService.issueSession(user, { method: 'passphrase' }, req);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account (gated by registration settings)' })
  async register(@Body() dto: RegisterDto) {
    return this.local.register(dto);
  }

  /** Non-consuming check so the register form can ask for the code first. */
  @Public()
  @Post('register/invite/check')
  @ApiOperation({ summary: 'Verify an invite code without consuming it' })
  checkInvite(@Body() dto: InviteCheckDto) {
    return this.local.verifyInviteCode(dto.code);
  }

  @Public()
  @Post('magic-link/request')
  @ApiOperation({ summary: 'Email a magic sign-in link' })
  requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    return this.local.requestMagicLink(dto.email);
  }

  @Public()
  @Post('magic-link/verify')
  @ApiOperation({ summary: 'Verify a magic link token and create a session' })
  async verifyMagicLink(@Body() dto: MagicLinkVerifyDto, @Req() req: Request) {
    const user = await this.local.verifyMagicLink(dto.token);
    return this.authService.issueSession(user, { method: 'magic-link' }, req);
  }

  @Public()
  @Post('phone/otp/request')
  @ApiOperation({ summary: 'Send an OTP code to a phone number' })
  requestPhoneOtp(@Body() dto: PhoneOtpRequestDto) {
    return this.local.requestPhoneOtp(dto.phone, dto.purpose ?? 'login');
  }

  @Public()
  @Post('phone/otp/verify')
  @ApiOperation({ summary: 'Verify a phone OTP code and create a session (login purpose)' })
  async verifyPhoneOtp(@Body() dto: LoginPhoneOtpDto, @Req() req: Request) {
    const { user } = await this.local.verifyPhoneOtp(dto.phone, dto.code, dto.purpose ?? 'login');
    if (!user) return { verified: true };
    return this.authService.issueSession(user, { method: 'otp' }, req);
  }

  @Public()
  @Post('password/forgot')
  @ApiOperation({ summary: 'Email a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.local.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password/reset')
  @ApiOperation({ summary: 'Reset a password with a reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.local.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('email/verify')
  @ApiOperation({ summary: 'Verify an email address with a verification token' })
  verifyEmail(@Body() dto: MagicLinkVerifyDto) {
    return this.local.verifyEmailToken(dto.token);
  }

  @Post('email/verify/resend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend the email verification link for the current user' })
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.local.resendVerificationEmail(user.id);
  }

  @ApiBearerAuth()
  @Post('password/change')
  @ApiOperation({ summary: 'Change the current user password' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.local.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @Post('phone/verify')
  @ApiOperation({ summary: 'Link and verify a phone number on the current account' })
  verifyMyPhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: PhoneOtpRequestDto) {
    return this.local.requestPhoneOtp(dto.phone, 'verify-phone');
  }

  @ApiBearerAuth()
  @Post('phone/verify/confirm')
  @ApiOperation({ summary: 'Confirm the OTP sent to the current user phone' })
  confirmMyPhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: LoginPhoneOtpDto) {
    return this.local.verifyPhoneOtp(dto.phone, dto.code, 'verify-phone', user.id);
  }

  /**
   * Returns the current session derived from the bearer token.
   * Used for session validation and getting the authenticated user.
   *
   * The frontend includes the sessionId in the Authorization header:
   * Authorization: Bearer <sessionId>
   */
  @ApiBearerAuth()
  @Get('session')
  @ApiOperation({ summary: 'Return the current authenticated session' })
  @ApiOkResponse({ description: 'Current Atlas user and session info.' })
  session(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /**
   * Logout: destroy the session.
   * Frontend includes sessionId in Authorization header.
   */
  @ApiBearerAuth()
  @Delete('logout')
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(@Req() req: Request): Promise<{ ok: boolean }> {
    const authHeader = req.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      await this.sessionService.destroySession(authHeader.substring(7));
    }
    return { ok: true };
  }
}
