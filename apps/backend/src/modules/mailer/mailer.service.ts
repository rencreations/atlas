import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createTransport } from 'nodemailer';
import { SettingsService } from '@/modules/settings/settings.service';

interface SendOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Multi-provider mailer. The provider (console | smtp | resend | ses) and
 * its credentials come from godmode settings (email.*), so operators can
 * switch providers without touching .env. The `console` provider prints
 * the message to the server log — the safe default for development.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private ses: SESClient | null = null;

  constructor(private readonly settings: SettingsService) {}

  async send(opts: SendOptions): Promise<void> {
    const provider = await this.settings.get<string>('email.provider');
    switch (provider) {
      case 'smtp':
        return this.sendSmtp(opts);
      case 'resend':
        return this.sendResend(opts);
      case 'ses':
        return this.sendSes(opts);
      case 'console':
      default:
        return this.logToConsole(opts);
    }
  }

  /** Where the magic-link / OTP mail actually went (godmode diagnostics). */
  async describeDelivery(): Promise<{ provider: string; from: string }> {
    const provider = await this.settings.get<string>('email.provider');
    const fromAddress = await this.settings.get<string>('email.fromAddress');
    const fromName = await this.settings.get<string>('email.fromName');
    return { provider, from: `${fromName} <${fromAddress}>` };
  }

  private logToConsole(opts: SendOptions): void {
    // Development adapter — the only provider that never swallows a
    // message when SMTP/API credentials are missing.
    this.logger.log(
      `[mail:console] to=${Array.isArray(opts.to) ? opts.to.join(',') : opts.to} subject="${opts.subject}"\n${opts.text}`,
    );
  }

  private async smtpTransport() {
    const [host, port, user, password, secure] = await Promise.all([
      this.settings.get<string>('email.smtp.host'),
      this.settings.get<number>('email.smtp.port'),
      this.settings.get<string>('email.smtp.user'),
      this.settings.get<string>('email.smtp.password'),
      this.settings.get<boolean>('email.smtp.secure'),
    ]);
    if (!host) throw new Error('SMTP host is not configured in godmode (email.smtp.host).');
    return createTransport({
      host,
      port: port || 587,
      secure: secure || port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }

  private async fromHeader(): Promise<string> {
    const fromAddress = await this.settings.get<string>('email.fromAddress');
    const fromName = await this.settings.get<string>('email.fromName');
    return `"${fromName}" <${fromAddress}>`;
  }

  private async sendSmtp(opts: SendOptions): Promise<void> {
    try {
      const transporter = await this.smtpTransport();
      await transporter.sendMail({
        from: await this.fromHeader(),
        to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
    } catch (err) {
      this.logger.error(`SMTP send failed: ${(err as Error).message}`);
    }
  }

  private async sendResend(opts: SendOptions): Promise<void> {
    const apiKey = await this.settings.get<string>('email.resend.apiKey');
    if (!apiKey) {
      this.logger.warn('Resend API key not configured — falling back to console.');
      return this.logToConsole(opts);
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: await this.fromHeader(),
          to: Array.isArray(opts.to) ? opts.to : [opts.to],
          subject: opts.subject,
          text: opts.text,
          ...(opts.html ? { html: opts.html } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error(`Resend send failed: ${(err as Error).message}`);
    }
  }

  private async sesClient(): Promise<SESClient> {
    if (this.ses) return this.ses;
    const [region, accessKeyId, secretAccessKey] = await Promise.all([
      this.settings.get<string>('email.ses.region'),
      this.settings.get<string>('email.ses.accessKeyId'),
      this.settings.get<string>('email.ses.secretAccessKey'),
    ]);
    this.ses = new SESClient({
      region: region || 'us-east-1',
      credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
    });
    return this.ses;
  }

  private async sendSes(opts: SendOptions): Promise<void> {
    try {
      const client = await this.sesClient();
      await client.send(
        new SendEmailCommand({
          Source: await this.fromHeader(),
          Destination: { ToAddresses: Array.isArray(opts.to) ? opts.to : [opts.to] },
          Message: {
            Subject: { Data: opts.subject },
            Body: {
              Text: { Data: opts.text },
              ...(opts.html ? { Html: { Data: opts.html } } : {}),
            },
          },
        }),
      );
    } catch (err) {
      this.logger.error(`SES send failed: ${(err as Error).message}`);
    }
  }
}
