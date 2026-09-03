import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';

export interface PushPayload {
  /// Visible title in the system notification.
  title: string;
  body: string;
  /// Path within Atlas the SW should open on click.
  link?: string;
  /// Used by the SW to group/replace prior notifications from the same thread.
  /// Always set on chat events so multiple messages collapse to one banner.
  tag?: string;
  /// Database id of the persisted Notification, round-tripped by quick-reply
  /// so the SW can call POST /notifications/:id/quick-reply.
  notificationId?: string;
  /// Discriminator the SW reads to decide whether to attach a reply action.
  /// Mirror of NotificationType.
  type?: string;
  /// Free-form metadata. Stays inside the SW; never displayed.
  data?: Record<string, unknown>;
}

/**
 * Fire-and-forget Web Push delivery. Never throws, the originating
 * mutation must complete even if every push fails. Dead endpoints
 * (404/410) are deleted so the user's subscription list self-prunes.
 *
 * Configuration is fully optional and read live from `SettingsService`
 * (DB, falling back to VAPID_* env) on every dispatch rather than cached
 * at boot, so generating or pasting VAPID keys from godmode takes effect
 * immediately, no restart needed. `integrations.push.enabled` is a
 * separate on/off switch: keys can stay saved while push is toggled off.
 */
@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async keys(): Promise<{ publicKey: string; privateKey: string; subject: string } | null> {
    const [enabled, publicKey, privateKey, subject] = await Promise.all([
      this.settings.get<boolean>('integrations.push.enabled'),
      this.settings.get<string>('integrations.push.vapidPublicKey'),
      this.settings.get<string>('integrations.push.vapidPrivateKey'),
      this.settings.get<string>('integrations.push.vapidSubject'),
    ]);
    if (!enabled || !publicKey || !privateKey || !subject) return null;
    return { publicKey, privateKey, subject };
  }

  async isConfigured(): Promise<boolean> {
    return (await this.keys()) !== null;
  }

  async getPublicKey(): Promise<string> {
    return (await this.keys())?.publicKey ?? '';
  }

  /**
   * Send a push to every active subscription for `userId`. Resolves once
   * all attempts have settled. Never rejects, failures are logged and
   * dead subscriptions are removed.
   */
  async dispatchToUser(userId: string, payload: PushPayload): Promise<void> {
    const keys = await this.keys();
    if (!keys) return;
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 * 24 },
        ),
      ),
    );

    const deadIds: string[] = [];
    const aliveIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        aliveIds.push(subs[i].id);
        return;
      }
      const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
      if (status === 404 || status === 410) {
        deadIds.push(subs[i].id);
      } else {
        this.logger.warn(
          `push dispatch failed for sub ${subs[i].id} (status=${status ?? 'unknown'})`,
        );
      }
    });

    if (deadIds.length > 0) {
      await this.prisma.pushSubscription
        .deleteMany({ where: { id: { in: deadIds } } })
        .catch((err: unknown) =>
          this.logger.warn(`failed to prune dead subscriptions: ${String(err)}`),
        );
    }
    if (aliveIds.length > 0) {
      await this.prisma.pushSubscription
        .updateMany({ where: { id: { in: aliveIds } }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }
  }

  /** Persist a subscription from the browser. Upserts by endpoint. */
  async subscribe(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    const now = new Date();
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastSeenAt: now,
      },
      update: {
        // `endpoint` is globally unique, so when the same browser
        // re-subscribes after a re-auth we want the row to follow the
        // current user.
        user: { connect: { id: input.userId } },
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastSeenAt: now,
      } satisfies Prisma.PushSubscriptionUpdateInput,
      select: { id: true, endpoint: true, createdAt: true, userAgent: true },
    });
  }

  /** Drop a subscription, scoped to its owner. Returns whether anything was removed. */
  async unsubscribe(userId: string, id: string): Promise<{ removed: number }> {
    const res = await this.prisma.pushSubscription.deleteMany({
      where: { id, userId },
    });
    return { removed: res.count };
  }

  /** List a user's registered devices for the settings UI. */
  listForUser(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true },
    });
  }
}
