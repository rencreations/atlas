import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface ChatAvatarFields {
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Discord-style server avatars for the chat rail. Rows are keyed:
 * 'workspace' for the workspace server, 'project:<id>' per project.
 * Null fields mean "use the derived default" (a stable random emoji on
 * a random background computed from the key on the client).
 */
@Injectable()
export class ChatAvatarsService {
  constructor(private readonly prisma: PrismaService) {}

  workspaceKey = 'workspace';
  projectKey(projectId: string) {
    return `project:${projectId}`;
  }

  /** Admin listing: the workspace row plus every live project with its override. */
  async listForAdmin() {
    const [workspace, projects] = await Promise.all([
      this.prisma.chatAvatar.findUnique({ where: { key: this.workspaceKey } }),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, slug: true, title: true },
      }),
    ]);
    const keys = projects.map((p) => this.projectKey(p.id));
    const rows = await this.prisma.chatAvatar.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return {
      workspace: this.toFields(workspace),
      projects: projects.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        avatar: this.toFields(byKey.get(this.projectKey(p.id)) ?? null),
      })),
    };
  }

  /** Get the override for one key, or null when nothing is configured. */
  async get(key: string): Promise<ChatAvatarFields | null> {
    const row = await this.prisma.chatAvatar.findUnique({ where: { key } });
    return this.toFields(row);
  }

  /** Get overrides for several keys at once (used by the chat overview). */
  async getMany(keys: string[]): Promise<Map<string, ChatAvatarFields>> {
    if (keys.length === 0) return new Map();
    const rows = await this.prisma.chatAvatar.findMany({ where: { key: { in: keys } } });
    return new Map(rows.map((r) => [r.key, this.toFields(r)!]));
  }

  async upsert(key: string, fields: ChatAvatarFields, updatedById: string) {
    this.validate(fields);
    if (!key.startsWith('project:') && key !== this.workspaceKey) {
      throw new BadRequestException('Unknown chat avatar key.');
    }
    if (key.startsWith('project:')) {
      const projectId = key.slice('project:'.length);
      const project = await this.prisma.project.findUnique({
        where: { id: projectId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Project not found.');
    }
    const row = await this.prisma.chatAvatar.upsert({
      where: { key },
      create: { key, ...fields, updatedById },
      update: { ...fields, updatedById },
    });
    return this.toFields(row);
  }

  /** Reset a key back to the derived default. */
  async remove(key: string) {
    const result = await this.prisma.chatAvatar.deleteMany({ where: { key } });
    if (result.count === 0) throw new NotFoundException('No chat avatar override for this key.');
    return { removed: result.count > 0 };
  }

  private validate(fields: ChatAvatarFields) {
    if (fields.emoji && [...fields.emoji].length > 8) {
      throw new BadRequestException('Emoji must be at most 8 characters.');
    }
    if (fields.color && !COLOR_RE.test(fields.color)) {
      throw new BadRequestException('Color must be a #rrggbb hex value.');
    }
    if (fields.imageUrl && fields.imageUrl.length > 500) {
      throw new BadRequestException('Image URL is too long.');
    }
  }

  private toFields(
    row: {
      emoji: string | null;
      color: string | null;
      imageUrl: string | null;
    } | null,
  ): ChatAvatarFields | null {
    if (!row) return null;
    return { emoji: row.emoji, color: row.color, imageUrl: row.imageUrl };
  }
}
