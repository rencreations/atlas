import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { SmsService } from './sms.service';
import { MailerService } from '@/modules/mailer/mailer.service';

const CODE_ALPHABET = '0123456789';

/**
 * One-time-code issuance and verification, shared by phone OTP login,
 * phone verification, and email verification flows. Codes are stored
 * hashed with an expiry and a max-attempts budget.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly sms: SmsService,
    private readonly mailer: MailerService,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async issue(
    purpose: string,
    target: string,
  ): Promise<{ code: string; ttlSeconds: number }> {
    const length = await this.settings.get<number>('sms.otpLength');
    const ttlSeconds = await this.settings.get<number>('sms.otpTtlSeconds');
    const code = Array.from({ length }, () => CODE_ALPHABET[randomInt(0, 10)]).join('');

    // Invalidate older outstanding codes for the same purpose+target.
    await this.prisma.otpChallenge.deleteMany({
      where: { purpose, target, consumedAt: null, expiresAt: { gt: new Date() } },
    });

    await this.prisma.otpChallenge.create({
      data: {
        purpose,
        target,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    return { code, ttlSeconds };
  }

  /** Send a login/verification code to a phone number via the SMS provider. */
  async sendPhoneCode(purpose: string, phone: string): Promise<{ ttlSeconds: number }> {
    const { code, ttlSeconds } = await this.issue(purpose, phone);
    await this.sms.sendSms(
      phone,
      `Your Atlas verification code is ${code}. It expires in ${Math.round(ttlSeconds / 60)} minutes.`,
    );
    return { ttlSeconds };
  }

  /** Send a verification code to an email address. */
  async sendEmailCode(purpose: string, email: string): Promise<{ ttlSeconds: number }> {
    const { code, ttlSeconds } = await this.issue(purpose, email);
    const siteName = await this.settings.get<string>('site.name');
    await this.mailer.send({
      to: email,
      subject: `${siteName} verification code`,
      text: `Your ${siteName} verification code is ${code}. It expires in ${Math.round(ttlSeconds / 60)} minutes. If you didn't request this, you can ignore this email.`,
    });
    return { ttlSeconds };
  }

  /** Verify a code. Consumes it on success; counts attempts on failure. */
  async verify(purpose: string, target: string, code: string): Promise<boolean> {
    const maxAttempts = await this.settings.get<number>('sms.otpMaxAttempts');
    const row = await this.prisma.otpChallenge.findFirst({
      where: { purpose, target, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw new UnauthorizedException('No active code, request a new one.');

    if (row.attempts >= maxAttempts) {
      await this.prisma.otpChallenge.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });
      throw new UnauthorizedException('Too many attempts, request a new code.');
    }

    if (row.codeHash !== this.hash(code.replace(/\s/g, ''))) {
      await this.prisma.otpChallenge.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }
}
