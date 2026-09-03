import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { StorageProvider, StorageService } from './storage.service';

const MAX_DELTA_PASSES = 50;
const PROGRESS_FLUSH_EVERY = 25;

/**
 * Background storage-provider migration.
 *
 * When the admin switches `storage.provider`, the change is not applied
 * immediately. A StorageMigration row is created and the job copies every
 * stored object from the old provider to the new one in the background.
 * Uploads and reads keep hitting the old provider the whole time; only
 * after a clean copy (plus delta passes that catch objects written during
 * the migration) does `storage.provider` flip to the target.
 *
 * Stored public URLs (project media, thumbnails, attachments) that point
 * at the old provider's base are rewritten to the new provider's base as
 * part of the flip, so existing links keep working.
 */
@Injectable()
export class StorageMigrationService implements OnModuleInit {
  private readonly logger = new Logger(StorageMigrationService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
  ) {}

  async onModuleInit(): Promise<void> {
    // A RUNNING row left behind by a crashed process can never finish;
    // mark it INTERRUPTED so a retry can start fresh.
    await this.prisma.storageMigration
      .updateMany({
        where: { status: 'RUNNING' },
        data: { status: 'INTERRUPTED', finishedAt: new Date() },
      })
      .catch(() => undefined);
  }

  /** Latest migration row for the godmode UI, or null when none exists yet. */
  async latest() {
    const row = await this.prisma.storageMigration.findFirst({ orderBy: { createdAt: 'desc' } });
    return row ? serializeMigration(row) : null;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Start a background migration from `from` to `to`. Returns the created
   * row, or null when nothing needs to move (source has no reachable data
   * or the same provider was picked).
   */
  async start(from: string, to: string) {
    if (this.running) {
      throw new ServiceUnavailableException('A storage migration is already running.');
    }
    const row = await this.prisma.storageMigration.create({
      data: { fromProvider: from, toProvider: to, status: 'RUNNING' },
    });
    this.running = true;
    void this.run(row.id).finally(() => {
      this.running = false;
    });
    return serializeMigration(row);
  }

  /** Re-run the last migration attempt (shown as a retry button after failures). */
  async retry() {
    const last = await this.latest();
    if (!last) throw new ServiceUnavailableException('There is no migration to retry.');
    if (last.status === 'RUNNING') {
      throw new ServiceUnavailableException('A storage migration is already running.');
    }
    return this.start(last.fromProvider, last.toProvider);
  }

  private async run(id: string): Promise<void> {
    const row = await this.prisma.storageMigration.findUnique({ where: { id } });
    if (!row) return;
    const from = row.fromProvider as StorageProvider;
    const to = row.toProvider as StorageProvider;

    const mark = async (
      data: Parameters<typeof this.prisma.storageMigration.update>[0]['data'],
    ) => {
      await this.prisma.storageMigration.update({ where: { id }, data }).catch(() => undefined);
    };

    try {
      // Nothing readable on the source side (disabled, or credentials
      // never filled in): the switch is instant, there is nothing to move.
      if (!(await this.storage.isReachable(from))) {
        await this.finish(id, from, to, mark);
        return;
      }

      const keys = await this.collectObjectKeys();
      await mark({ objectCount: keys.length, totalBytes: 0 });

      // No data anywhere: the switch is instant.
      if (keys.length === 0) {
        await this.finish(id, from, to, mark);
        return;
      }

      // Probe the target first so configuration mistakes fail fast with a
      // clear error instead of half a copy.
      const probe = await this.storage.ping(to);
      if (!probe) {
        throw new Error(
          `The target storage (${to}) is not configured or not reachable. Check its credentials in godmode, then retry.`,
        );
      }

      let transferred = 0;
      let bytes = 0n;
      let pass = 0;
      const seen = new Map<string, number>(); // key -> size at copy time
      while (pass < MAX_DELTA_PASSES) {
        pass += 1;
        const remaining = keys.filter((k) => !seen.has(k));
        if (remaining.length === 0 && pass > 1) break;

        for (const key of remaining) {
          // Already migrated? Skip objects that exist on the target with
          // the same size (a resumed migration never recopies).
          const targetHead = await this.storage.headObject(key, to);
          if (targetHead.exists && targetHead.size !== undefined) {
            seen.set(key, targetHead.size);
            continue;
          }
          let body: Buffer;
          try {
            body = await this.storage.getObject(key, from);
          } catch (err) {
            throw new Error(
              `Object ${key} could not be read from ${from}: ${(err as Error).message}`,
            );
          }
          await this.storage.putObject(key, body, guessContentType(key), to);
          seen.set(key, body.length);
          transferred += 1;
          bytes += BigInt(body.length);
          if (transferred % PROGRESS_FLUSH_EVERY === 0 || transferred === 1) {
            await mark({ transferredCount: transferred, transferredBytes: bytes });
          }
        }

        // Delta: new objects written during the copy show up in a re-list.
        const after = await this.storage.listKeys(from);
        const added = after.filter((k) => !seen.has(k));
        if (added.length === 0) break;
        keys.push(...added);
        await mark({ objectCount: keys.length });
      }

      await mark({ transferredCount: transferred, transferredBytes: bytes });
      await this.finish(id, from, to, mark);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown migration error.';
      this.logger.warn(`Storage migration ${id} failed: ${message}`);
      await mark({ status: 'FAILED', error: message.slice(0, 2000), finishedAt: new Date() });
    }
  }

  private async finish(
    id: string,
    from: StorageProvider,
    to: StorageProvider,
    mark: (
      data: Parameters<typeof this.prisma.storageMigration.update>[0]['data'],
    ) => Promise<void>,
  ): Promise<void> {
    // Rewrite stored public URLs that point at the old provider's base.
    await this.rewriteStoredUrls(from, to);
    // Flip the active provider. Writes have been flowing to the old side
    // until now; from here on everything targets the new provider.
    await this.settings.set('storage.provider', to, 'storage-migration');
    await mark({ status: 'COMPLETED', finishedAt: new Date() });
    this.logger.log(`Storage migration ${id} completed: ${from} -> ${to}`);
  }

  /** Every object key referenced by the database (stored keys + URLs). */
  private async collectObjectKeys(): Promise<string[]> {
    const keys = new Set<string>();

    // Bare keys stored in s3Key columns.
    const bareRows: ({ s3Key: string | null } | { avatarS3Key: string | null })[][] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { avatarS3Key: { not: null } },
          select: { avatarS3Key: true },
        }),
        this.prisma.chatAttachment.findMany({ select: { s3Key: true } }),
        this.prisma.sticker.findMany({ select: { s3Key: true } }),
        this.prisma.projectFile.findMany({ select: { s3Key: true } }),
        this.prisma.taskAttachment.findMany({ select: { s3Key: true } }),
        this.prisma.taskCommentAttachment.findMany({ select: { s3Key: true } }),
        this.prisma.voiceRecording.findMany({
          where: { s3Key: { not: null } },
          select: { s3Key: true },
        }),
      ]);
    for (const rows of bareRows) {
      for (const r of rows) {
        const key = 's3Key' in r ? r.s3Key : r.avatarS3Key;
        if (key) keys.add(key);
      }
    }

    // Stored public URLs (rewritten after a successful migration).
    const urlRows: ({ url: string | null } | { thumbnailUrl: string | null })[][] =
      await Promise.all([
        this.prisma.project.findMany({
          where: { thumbnailUrl: { not: null } },
          select: { thumbnailUrl: true },
        }),
        this.prisma.projectMedia.findMany({ select: { url: true } }),
        this.prisma.chatAttachment.findMany({ select: { url: true } }),
        this.prisma.sticker.findMany({ select: { url: true } }),
        this.prisma.taskAttachment.findMany({ select: { url: true } }),
        this.prisma.taskCommentAttachment.findMany({ select: { url: true } }),
        this.prisma.projectFile.findMany({ where: { url: { not: null } }, select: { url: true } }),
      ]);
    for (const rows of urlRows) {
      for (const r of rows) {
        const url = 'url' in r ? r.url : r.thumbnailUrl;
        if (!url) continue;
        const key = await this.storage.keyFromPublicUrl(url);
        if (key) keys.add(key);
      }
    }

    return [...keys];
  }

  /** After the flip, stored URLs built on the old base move to the new base. */
  private async rewriteStoredUrls(from: StorageProvider, to: StorageProvider): Promise<void> {
    const nextUrl = async (url: string | null): Promise<string | null> => {
      if (!url) return null;
      const key = await this.storage.keyFromPublicUrl(url, from);
      if (!key) return null;
      const next = await this.storage.publicUrlFor(key, to);
      return next !== url ? next : null;
    };

    const [thumbs, media, attachments, stickers, taskAtt, taskCommentAtt, files] =
      await Promise.all([
        this.prisma.project.findMany({
          where: { thumbnailUrl: { not: null } },
          select: { id: true, thumbnailUrl: true },
        }),
        this.prisma.projectMedia.findMany({ select: { id: true, url: true } }),
        this.prisma.chatAttachment.findMany({ select: { id: true, url: true } }),
        this.prisma.sticker.findMany({ select: { id: true, url: true } }),
        this.prisma.taskAttachment.findMany({ select: { id: true, url: true } }),
        this.prisma.taskCommentAttachment.findMany({ select: { id: true, url: true } }),
        this.prisma.projectFile.findMany({
          where: { url: { not: null } },
          select: { id: true, url: true },
        }),
      ]);

    for (const t of thumbs) {
      const next = await nextUrl(t.thumbnailUrl);
      if (next)
        await this.prisma.project.update({ where: { id: t.id }, data: { thumbnailUrl: next } });
    }
    for (const m of media) {
      const next = await nextUrl(m.url);
      if (next) await this.prisma.projectMedia.update({ where: { id: m.id }, data: { url: next } });
    }
    for (const a of attachments) {
      const next = await nextUrl(a.url);
      if (next)
        await this.prisma.chatAttachment.update({ where: { id: a.id }, data: { url: next } });
    }
    for (const s of stickers) {
      const next = await nextUrl(s.url);
      if (next) await this.prisma.sticker.update({ where: { id: s.id }, data: { url: next } });
    }
    for (const a of taskAtt) {
      const next = await nextUrl(a.url);
      if (next)
        await this.prisma.taskAttachment.update({ where: { id: a.id }, data: { url: next } });
    }
    for (const a of taskCommentAtt) {
      const next = await nextUrl(a.url);
      if (next)
        await this.prisma.taskCommentAttachment.update({
          where: { id: a.id },
          data: { url: next },
        });
    }
    for (const f of files) {
      const next = await nextUrl(f.url);
      if (next) await this.prisma.projectFile.update({ where: { id: f.id }, data: { url: next } });
    }
  }
}

/** BigInt columns (byte counters) cannot go through JSON.stringify as-is. */
function serializeMigration(row: {
  id: string;
  fromProvider: string;
  toProvider: string;
  status: string;
  objectCount: number;
  transferredCount: number;
  totalBytes: bigint;
  transferredBytes: bigint;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
}) {
  return {
    ...row,
    totalBytes: row.totalBytes.toString(),
    transferredBytes: row.transferredBytes.toString(),
  };
}

function guessContentType(key: string): string {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}
