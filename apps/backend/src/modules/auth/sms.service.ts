import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '@/modules/settings/settings.service';

/**
 * Multi-provider SMS delivery for phone OTP codes.
 * Provider + credentials come from godmode settings (sms.*).
 * `console` prints the code to the server log (development default).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly settings: SettingsService) {}

  async sendSms(to: string, text: string): Promise<void> {
    const provider = await this.settings.get<string>('sms.provider');
    switch (provider) {
      case 'twilio':
        return this.sendTwilio(to, text);
      case 'vonage':
        return this.sendVonage(to, text);
      case 'infobip':
        return this.sendInfobip(to, text);
      case 'sinch':
        return this.sendSinch(to, text);
      case 'messagebird':
        return this.sendMessagebird(to, text);
      case 'console':
      default:
        this.logger.log(`[sms:console] to=${to} text="${text}"`);
        return;
    }
  }

  private async sendTwilio(to: string, text: string): Promise<void> {
    const [accountSid, authToken, from] = await Promise.all([
      this.settings.get<string>('sms.twilio.accountSid'),
      this.settings.get<string>('sms.twilio.authToken'),
      this.settings.get<string>('sms.twilio.from'),
    ]);
    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials missing, falling back to console.');
      return this.sendSmsFallback(to, text);
    }
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: text }),
      },
    );
    if (!res.ok) {
      this.logger.error(`Twilio send failed: ${res.status} ${await res.text()}`);
    }
  }

  private async sendVonage(to: string, text: string): Promise<void> {
    const [apiKey, apiSecret, from] = await Promise.all([
      this.settings.get<string>('sms.vonage.apiKey'),
      this.settings.get<string>('sms.vonage.apiSecret'),
      this.settings.get<string>('sms.vonage.from'),
    ]);
    if (!apiKey || !apiSecret) {
      this.logger.warn('Vonage credentials missing, falling back to console.');
      return this.sendSmsFallback(to, text);
    }
    const res = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        api_secret: apiSecret,
        from,
        to,
        text,
      }),
    });
    if (!res.ok) {
      this.logger.error(`Vonage send failed: ${res.status} ${await res.text()}`);
    }
  }

  private async sendInfobip(to: string, text: string): Promise<void> {
    const [apiKey, baseUrl, from] = await Promise.all([
      this.settings.get<string>('sms.infobip.apiKey'),
      this.settings.get<string>('sms.infobip.baseUrl'),
      this.settings.get<string>('sms.infobip.from'),
    ]);
    if (!apiKey) {
      this.logger.warn('Infobip API key missing, falling back to console.');
      return this.sendSmsFallback(to, text);
    }
    const res = await fetch(
      `${(baseUrl || 'https://api.infobip.com').replace(/\/+$/, '')}/sms/2/text/advanced`,
      {
        method: 'POST',
        headers: {
          authorization: `App ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ destinations: [{ to }], from: from || 'Atlas', text }],
        }),
      },
    );
    if (!res.ok) {
      this.logger.error(`Infobip send failed: ${res.status} ${await res.text()}`);
    }
  }

  private async sendSinch(to: string, text: string): Promise<void> {
    const [apiToken, projectId, servicePlanId, from] = await Promise.all([
      this.settings.get<string>('sms.sinch.apiToken'),
      this.settings.get<string>('sms.sinch.projectId'),
      this.settings.get<string>('sms.sinch.servicePlanId'),
      this.settings.get<string>('sms.sinch.from'),
    ]);
    if (!apiToken || !servicePlanId) {
      this.logger.warn('Sinch credentials missing, falling back to console.');
      return this.sendSmsFallback(to, text);
    }
    const res = await fetch(`https://sms.api.sinch.com/xms/v1/${servicePlanId}/batches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Atlas',
        to: [to],
        body: text,
        ...(projectId ? { delivery_report: 'none' } : {}),
      }),
    });
    if (!res.ok) {
      this.logger.error(`Sinch send failed: ${res.status} ${await res.text()}`);
    }
  }

  private async sendMessagebird(to: string, text: string): Promise<void> {
    const [apiKey, from] = await Promise.all([
      this.settings.get<string>('sms.messagebird.apiKey'),
      this.settings.get<string>('sms.messagebird.from'),
    ]);
    if (!apiKey) {
      this.logger.warn('MessageBird API key missing, falling back to console.');
      return this.sendSmsFallback(to, text);
    }
    const res = await fetch('https://rest.messagebird.com/messages', {
      method: 'POST',
      headers: {
        authorization: `AccessKey ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ recipients: [to], originator: from || 'Atlas', body: text }),
    });
    if (!res.ok) {
      this.logger.error(`MessageBird send failed: ${res.status} ${await res.text()}`);
    }
  }

  private sendSmsFallback(to: string, text: string): Promise<void> {
    this.logger.log(`[sms:console] to=${to} text="${text}"`);
    return Promise.resolve();
  }
}
