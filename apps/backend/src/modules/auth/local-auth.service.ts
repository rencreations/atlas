import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { MailerService } from '@/modules/mailer/mailer.service';
import { IdentityService, SessionUser } from './identity.service';
import { OtpService } from './otp.service';
import { PassphraseCredentialsService } from './passphrase-credentials.service';

const BCRYPT_ROUNDS = 12;

const SESSION_USER_SELECT = {
  id: true,
  keycloakId: true,
  email: true,
  name: true,
  avatarUrl: true,
  isAdmin: true,
  emailVerified: true,
} satisfies Prisma.UserSelect;

/**
 * Local sign-in flows: email+password, registration, password reset,
 * magic links, email verification, the instance passphrase, and phone
 * OTP login. Every successful flow returns a SessionUser, the caller
 * (AuthService) mints the database session.
 */
@Injectable()
export class LocalAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly mailer: MailerService,
    private readonly otp: OtpService,
    private readonly identity: IdentityService,
    private readonly passphraseCredentials: PassphraseCredentialsService,
  ) {}

  private async minPasswordLength(): Promise<number> {
    return this.settings.get<number>('auth.passwordMinLength');
  }

  // ─── Email + password ─────────────────────────────────────────────

  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{
    user: SessionUser;
    mustChangePassword: boolean;
  }> {
    if (!(await this.settings.get<boolean>('auth.emailPassword.enabled'))) {
      throw new ForbiddenException('Email + password sign-in is disabled on this instance.');
    }
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      include: { passwordCredential: true },
    });
    if (!user || !user.passwordCredential) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const ok = await bcrypt.compare(password, user.passwordCredential.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password.');
    if (
      user.emailVerified === false &&
      (await this.settings.get<boolean>('registration.requireEmailVerification'))
    ) {
      throw new ForbiddenException('Please verify your email address before signing in.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const sessionUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: SESSION_USER_SELECT,
    });
    return {
      user: sessionUser as unknown as SessionUser,
      mustChangePassword: user.passwordCredential.mustChange,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<void> {
    const minLen = await this.minPasswordLength();
    if (newPassword.length < minLen) {
      throw new BadRequestException(`Password must be at least ${minLen} characters.`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { passwordCredential: true },
    });
    if (!user?.passwordCredential) throw new NotFoundException('No password set on this account.');

    // A forced change (mustChange) may skip the current-password check —
    // the user just proved possession by signing in. Otherwise require it.
    if (!user.passwordCredential.mustChange) {
      if (
        !currentPassword ||
        !(await bcrypt.compare(currentPassword, user.passwordCredential.passwordHash))
      ) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
    }

    await this.prisma.passwordCredential.update({
      where: { userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChange: false },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date() },
    });
  }

  // ─── Registration ─────────────────────────────────────────────────

  async register(dto: {
    email: string;
    password: string;
    name: string;
    inviteCode?: string;
    acceptedTerms?: boolean;
  }): Promise<{ user: SessionUser; emailVerificationSent: boolean }> {
    if (!(await this.settings.get<boolean>('registration.enabled'))) {
      throw new ForbiddenException('Self-registration is disabled on this instance.');
    }
    if (await this.settings.get<boolean>('registration.inviteRequired')) {
      if (!dto.inviteCode) {
        throw new ForbiddenException('This instance requires an invite code to register.');
      }
      await this.consumeInviteCode(dto.inviteCode, dto.email);
    }

    const email = dto.email.toLowerCase().trim();
    const minLen = await this.minPasswordLength();
    if (dto.password.length < minLen) {
      throw new BadRequestException(`Password must be at least ${minLen} characters.`);
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with that email already exists.');
    }

    const requireVerification = await this.settings.get<boolean>(
      'registration.requireEmailVerification',
    );
    const defaultRoleCode = await this.settings.get<string>('registration.defaultRole');
    const defaultRole = await this.prisma.role.findUnique({
      where: { code: defaultRoleCode },
    });
    // `legal.requireConsent` used to be recorded as accepted for everyone
    // without ever asking, which made the stored consent timestamp a lie.
    const requireConsent = await this.settings.get<boolean>('legal.requireConsent');
    if (requireConsent && !dto.acceptedTerms) {
      throw new BadRequestException(
        'You must accept the terms of service and privacy policy to create an account.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name || email.split('@')[0],
        avatarUrl: this.identity.gravatarUrl(email),
        emailVerified: !requireVerification,
        consentAcceptedAt: requireConsent ? new Date() : null,
        identities: { create: { provider: 'password', providerId: email } },
        passwordCredential: {
          create: { passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS) },
        },
        ...(defaultRole ? { userRoles: { create: { roleId: defaultRole.id } } } : {}),
      },
      select: SESSION_USER_SELECT,
    });

    let emailVerificationSent = false;
    if (requireVerification) {
      await this.sendVerificationEmail(user.id, email);
      emailVerificationSent = true;
    }

    return { user: user as unknown as SessionUser, emailVerificationSent };
  }

  /** Issue a single-use invite code (godmode/admin feature). */
  async issueInviteCode(email?: string): Promise<{ code: string }> {
    const code = randomBytes(6).toString('hex').toUpperCase();
    const ttlHours = 24 * 7;
    await this.prisma.magicLinkToken.create({
      data: {
        purpose: 'invite-accept',
        email: (email ?? '').toLowerCase(),
        tokenHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + ttlHours * 3600_000),
      },
    });
    return { code };
  }

  /** Non-consuming invite check so the register page can gate its form on it. */
  async verifyInviteCode(code: string): Promise<{ valid: boolean }> {
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        purpose: 'invite-accept',
        tokenHash: this.hashToken(code.trim().toUpperCase()),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('Invalid or expired invite code.');
    return { valid: true };
  }

  private async consumeInviteCode(code: string, email: string): Promise<void> {
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        purpose: 'invite-accept',
        tokenHash: this.hashToken(code.trim().toUpperCase()),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) throw new ForbiddenException('Invalid or expired invite code.');
    if (row.email && row.email !== email.toLowerCase()) {
      throw new ForbiddenException('This invite code belongs to a different email address.');
    }
    await this.prisma.magicLinkToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
  }

  // ─── Email verification ───────────────────────────────────────────

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = randomBytes(24).toString('hex');
    const ttlHours = 24;
    await this.prisma.magicLinkToken.create({
      data: {
        purpose: 'email-verify',
        userId,
        email,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + ttlHours * 3600_000),
      },
    });
    const instanceUrl = await this.settings.get<string>('system.instanceUrl');
    const link = `${instanceUrl.replace(/\/+$/, '')}/auth/verify-email?token=${token}`;
    const siteName = await this.settings.get<string>('site.name');
    await this.mailer.send({
      to: email,
      subject: `Verify your email, ${siteName}`,
      text: `Welcome to ${siteName}! Click this link to verify your email address:\n\n${link}\n\nThis link expires in 24 hours.`,
    });
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.emailVerified) return;
    await this.sendVerificationEmail(user.id, user.email);
  }

  async verifyEmailToken(token: string): Promise<{ verified: boolean }> {
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        purpose: 'email-verify',
        tokenHash: this.hashToken(token),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) throw new UnauthorizedException('Invalid or expired verification link.');
    await this.prisma.$transaction([
      this.prisma.magicLinkToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      ...(row.userId
        ? [
            this.prisma.user.update({
              where: { id: row.userId },
              data: { emailVerified: true },
            }),
          ]
        : []),
    ]);
    return { verified: true };
  }

  // ─── Magic link sign-in ───────────────────────────────────────────

  async requestMagicLink(email: string): Promise<{ delivered: boolean }> {
    if (!(await this.settings.get<boolean>('auth.magicLink.enabled'))) {
      throw new ForbiddenException('Magic link sign-in is disabled on this instance.');
    }
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      // Don't leak account existence, pretend success and send nothing.
      return { delivered: false };
    }
    const token = randomBytes(24).toString('hex');
    const ttlMinutes = 15;
    await this.prisma.magicLinkToken.create({
      data: {
        purpose: 'login',
        userId: user.id,
        email: normalized,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    const instanceUrl = await this.settings.get<string>('system.instanceUrl');
    const link = `${instanceUrl.replace(/\/+$/, '')}/auth/magic-link?token=${token}`;
    const siteName = await this.settings.get<string>('site.name');
    await this.mailer.send({
      to: normalized,
      subject: `Your ${siteName} sign-in link`,
      text: `Click this link to sign in to ${siteName}:\n\n${link}\n\nThis link expires in ${ttlMinutes} minutes. If you didn't request it, you can ignore this email.`,
    });
    return { delivered: true };
  }

  async verifyMagicLink(token: string): Promise<SessionUser> {
    if (!(await this.settings.get<boolean>('auth.magicLink.enabled'))) {
      throw new ForbiddenException('Magic link sign-in is disabled on this instance.');
    }
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        purpose: 'login',
        tokenHash: this.hashToken(token),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row || !row.userId) {
      throw new UnauthorizedException('Invalid or expired sign-in link.');
    }
    await this.prisma.magicLinkToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    const user = await this.prisma.user.update({
      where: { id: row.userId },
      data: { lastLoginAt: new Date(), emailVerified: true },
      select: SESSION_USER_SELECT,
    });
    return user as unknown as SessionUser;
  }

  // ─── Forgot / reset password ──────────────────────────────────────

  async requestPasswordReset(email: string): Promise<{ delivered: boolean }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      include: { passwordCredential: true },
    });
    if (!user?.passwordCredential) return { delivered: false };

    const token = randomBytes(24).toString('hex');
    const ttlMinutes = 30;
    await this.prisma.magicLinkToken.create({
      data: {
        purpose: 'password-reset',
        userId: user.id,
        email: normalized,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    const instanceUrl = await this.settings.get<string>('system.instanceUrl');
    const link = `${instanceUrl.replace(/\/+$/, '')}/auth/reset-password?token=${token}`;
    const siteName = await this.settings.get<string>('site.name');
    await this.mailer.send({
      to: normalized,
      subject: `Reset your ${siteName} password`,
      text: `Click this link to reset your password:\n\n${link}\n\nThis link expires in ${ttlMinutes} minutes. If you didn't request it, you can ignore this email.`,
    });
    return { delivered: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const minLen = await this.minPasswordLength();
    if (newPassword.length < minLen) {
      throw new BadRequestException(`Password must be at least ${minLen} characters.`);
    }
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        purpose: 'password-reset',
        tokenHash: this.hashToken(token),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row || !row.userId) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }
    await this.prisma.$transaction([
      this.prisma.magicLinkToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordCredential.update({
        where: { userId: row.userId },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChange: false },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordChangedAt: new Date() },
      }),
    ]);
  }

  // ─── Phone OTP login ──────────────────────────────────────────────

  async requestPhoneOtp(
    phone: string,
    purpose: 'login' | 'verify-phone',
  ): Promise<{ ttlSeconds: number }> {
    if (!(await this.settings.get<boolean>('auth.phone.enabled'))) {
      throw new ForbiddenException('Phone sign-in is disabled on this instance.');
    }
    if (!(await this.settings.get<boolean>('auth.phone.otpEnabled'))) {
      throw new ForbiddenException('Phone OTP sign-in is disabled on this instance.');
    }
    return this.otp.sendPhoneCode(purpose, phone);
  }

  async verifyPhoneOtp(
    phone: string,
    code: string,
    purpose: 'login' | 'verify-phone',
    userId?: string,
  ): Promise<{ user?: SessionUser }> {
    const ok = await this.otp.verify(purpose, phone, code);
    if (!ok) throw new UnauthorizedException('Invalid code.');

    const existing = await this.prisma.user.findUnique({
      where: { phone },
      select: SESSION_USER_SELECT,
    });

    if (purpose === 'verify-phone' && userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone, phoneVerified: true },
      });
      return {};
    }

    if (!existing) {
      throw new UnauthorizedException('No account found for that phone number.');
    }
    if (
      existing.emailVerified === false &&
      (await this.settings.get<boolean>('registration.requireEmailVerification'))
    ) {
      throw new ForbiddenException('Please verify your email address before signing in.');
    }
    await this.prisma.user.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date() },
    });
    return { user: existing as unknown as SessionUser };
  }

  // ─── Instance passphrase ──────────────────────────────────────────

  /**
   * Each named passphrase credential resolves to its own user identity
   * (`passphrase+<credentialId>@local`), so different credentials carry
   * different roles/permissions instead of sharing one account.
   */
  async loginWithPassphrase(passphrase: string): Promise<SessionUser> {
    const match = await this.passphraseCredentials.findMatch(passphrase);
    if (!match) {
      throw new UnauthorizedException('Incorrect passphrase.');
    }

    const role = await this.prisma.role.findUnique({ where: { code: match.roleCode } });
    const email = `passphrase+${match.id}@local`;
    let user = (await this.prisma.user.findUnique({
      where: { email },
      select: SESSION_USER_SELECT,
    })) as unknown as SessionUser | null;
    if (!user) {
      user = (await this.prisma.user.create({
        data: {
          email,
          name: match.name,
          emailVerified: true,
          isAdmin: match.roleCode === 'admin' || match.roleCode === 'superadmin',
          identities: { create: { provider: 'passphrase', providerId: match.id } },
          ...(role ? { userRoles: { create: { roleId: role.id } } } : {}),
        },
        select: SESSION_USER_SELECT,
      })) as unknown as SessionUser;
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return user;
  }

  // ─── Shared helpers ───────────────────────────────────────────────

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
