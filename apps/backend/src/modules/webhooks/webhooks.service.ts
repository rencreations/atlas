import { createHmac } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';

export type AtlasWebhookEvent =
  | 'contribution.submitted'
  | 'contribution.approved'
  | 'contribution.rejected'
  | 'contribution.withdrawn'
  | 'project.invited'
  | 'project.member_added'
  | 'project.member_removed';

export interface WebhookEnvelope<T = unknown> {
  event: AtlasWebhookEvent;
  timestamp: string;
  source: 'atlas';
  data: T;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Read live from `SettingsService` (DB, falling back to env) rather than
   * caching at boot, so turning the toggle on/off or editing the URL in
   * godmode takes effect on the next dispatch, no restart needed.
   */
  private async target(): Promise<{ url: string; secret: string } | null> {
    const [enabled, base, path, secret] = await Promise.all([
      this.settings.get<boolean>('integrations.n8n.enabled'),
      this.settings.get<string>('integrations.n8n.baseUrl'),
      this.settings.get<string>('integrations.n8n.webhookPath'),
      this.settings.get<string>('integrations.n8n.secret'),
    ]);
    const cleanBase = (base ?? '').replace(/\/+$/, '');
    if (!enabled || !cleanBase) return null;
    const cleanPath = path || '/webhook/atlas';
    return {
      url: `${cleanBase}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`,
      secret: secret ?? '',
    };
  }

  /**
   * Fire-and-forget dispatch to n8n. The webhook is logged in WebhookDelivery
   * regardless of outcome. Failures are surfaced as warnings, they never
   * block the user-facing request, since email is async UX anyway.
   */
  async dispatch<T>(event: AtlasWebhookEvent, data: T): Promise<void> {
    const target = await this.target();
    if (!target) {
      this.logger.debug(`Skipping ${event}, webhooks not configured.`);
      return;
    }

    const envelope: WebhookEnvelope<T> = {
      event,
      timestamp: new Date().toISOString(),
      source: 'atlas',
      data,
    };
    const body = JSON.stringify(envelope);
    const signature = createHmac('sha256', target.secret).update(body).digest('hex');

    const log = await this.prisma.webhookDelivery.create({
      data: { event, payload: envelope as object },
    });

    try {
      const res = await axios.post(target.url, envelope, {
        headers: {
          'content-type': 'application/json',
          'x-atlas-signature': signature,
          'x-atlas-event': event,
        },
        timeout: 10_000,
        validateStatus: () => true,
      });

      const succeeded = res.status >= 200 && res.status < 300;
      await this.prisma.webhookDelivery.update({
        where: { id: log.id },
        data: {
          status: res.status,
          responseBody:
            typeof res.data === 'string'
              ? res.data.slice(0, 4000)
              : JSON.stringify(res.data).slice(0, 4000),
          succeeded,
          completedAt: new Date(),
        },
      });

      if (!succeeded) {
        this.logger.warn(`n8n webhook ${event} returned ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`n8n webhook ${event} failed: ${(err as Error).message}`);
      await this.prisma.webhookDelivery.update({
        where: { id: log.id },
        data: {
          succeeded: false,
          responseBody: (err as Error).message.slice(0, 4000),
          completedAt: new Date(),
        },
      });
    }
  }
}

// Careful: changing this interacts with PMO file allowlist policy

// Careful: changing this interacts with notifications inbox pagination

// See the incident notes for e2e flakiness triage before changing defaults
