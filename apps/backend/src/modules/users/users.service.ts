import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { S3Service } from '@/modules/media/s3.service';
import { UpdateMeDto } from './dto/update-me.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  avatarS3Key: true,
  bio: true,
  isAdmin: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly s3: S3Service,
  ) {}

  async getMe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_USER_SELECT,
        lastLoginAt: true,
        phone: true,
        phoneVerified: true,
        emailVerified: true,
        theme: true,
        consentAcceptedAt: true,
        passwordChangedAt: true,
        userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    const { avatarS3Key, ...rest } = user;
    return {
      ...rest,
      // The user-uploaded avatar wins; the stored URL is the SSO/Gravatar
      // fallback underneath it.
      avatarUrl: avatarS3Key ? this.s3.publicUrlFor(avatarS3Key) : user.avatarUrl,
    };
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: { ...PUBLIC_USER_SELECT, lastLoginAt: true, theme: true },
    });
    const { avatarS3Key, ...rest } = user;
    return {
      ...rest,
      avatarUrl: avatarS3Key ? this.s3.publicUrlFor(avatarS3Key) : user.avatarUrl,
    };
  }

  /** Presigned upload URL for the user's avatar. */
  async avatarPresign(userId: string, contentType: string, contentLength?: number) {
    const key = `avatars/${userId}/${Date.now()}-${randomUUID().slice(0, 8)}${this.extensionFor(contentType)}`;
    return this.s3.presignPut({ key, contentType, contentLength: contentLength ?? 0 });
  }

  async recordConsent(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { consentAcceptedAt: new Date() },
    });
    return { acceptedAt: new Date() };
  }

  private extensionFor(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '';
    }
  }

  async listUsers(opts: { search?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 24, 100);
    const where: Prisma.UserWhereInput = opts.search
      ? {
          OR: [
            { email: { contains: opts.search, mode: 'insensitive' } },
            { name: { contains: opts.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_USER_SELECT,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * Grant/revoke the admin role (legacy endpoint kept for the admin
   * console). Admin status is now role-based — the boolean flag is the
   * denormalized mirror.
   */
  async setAdmin(actorId: string, targetId: string, isAdmin: boolean) {
    if (actorId === targetId) {
      throw new ForbiddenException('Admins cannot change their own admin status.');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found.');

    const adminRole = await this.prisma.role.findUnique({ where: { code: 'admin' } });
    if (!adminRole) throw new NotFoundException('Admin role template is missing — run the seed.');

    if (isAdmin) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: targetId, roleId: adminRole.id } },
        create: { userId: targetId, roleId: adminRole.id, grantedById: actorId },
        update: {},
      });
    } else {
      await this.prisma.userRole.deleteMany({
        where: { userId: targetId, roleId: adminRole.id },
      });
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { isAdmin },
      select: PUBLIC_USER_SELECT,
    });
  }

  /** True when the actor holds the superadmin role. */
  private async isSuperadmin(actorId: string): Promise<boolean> {
    const grants = await this.prisma.userRole.findMany({
      where: { userId: actorId, role: { code: 'superadmin' } },
      take: 1,
    });
    return grants.length > 0;
  }

  /** Create a user from the admin console with a role grant. */
  async createUser(
    dto: { email: string; name: string; password?: string; roleCode?: string },
    actorId: string,
  ) {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('A user with that email already exists.');
    }
    const roleCode = dto.roleCode ?? 'member';
    // Only superadmins may mint other superadmins — otherwise any admin
    // could escalate by creating a privileged account.
    if (roleCode === 'superadmin' && !(await this.isSuperadmin(actorId))) {
      throw new ForbiddenException('Only superadmins can create superadmin accounts.');
    }
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new BadRequestException(`Unknown role: ${roleCode}`);

    if (dto.password && dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name || email.split('@')[0],
        emailVerified: true,
        isAdmin: roleCode === 'admin' || roleCode === 'superadmin',
        identities: { create: { provider: 'password', providerId: email } },
        ...(dto.password
          ? {
              passwordCredential: {
                create: {
                  passwordHash: await bcrypt.hash(dto.password, 12),
                  // Best practice: admin-provisioned accounts must change
                  // the password on first login.
                  mustChange: true,
                },
              },
            }
          : {}),
        userRoles: { create: { roleId: role.id, grantedById: actorId } },
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  /** Admin-initiated password reset: sets a fresh password with mustChange. */
  async adminResetPassword(actorId: string, targetId: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: {
        passwordCredential: true,
        userRoles: { where: { role: { code: 'superadmin' } }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.passwordCredential) {
      throw new BadRequestException('This account has no local password (external identity only).');
    }
    // Nobody may seize a superadmin account: the target's privilege must
    // be strictly below the actor's.
    if (user.userRoles.length > 0 && !(await this.isSuperadmin(actorId))) {
      throw new ForbiddenException('Only superadmins can reset a superadmin password.');
    }
    await this.prisma.$transaction([
      this.prisma.passwordCredential.update({
        where: { userId: targetId },
        data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChange: true },
      }),
      // An admin reset invalidates every existing session — if the
      // account was compromised, this kicks the attacker out.
      this.prisma.session.deleteMany({ where: { userId: targetId } }),
    ]);
    return { ok: true };
  }

  /** Roles held by a user (permission-relevant). */
  async listRoles(userId: string) {
    const grants = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { id: true, code: true, name: true, permissions: true } } },
    });
    return grants.map((g) => g.role);
  }

  // ─── "For me" overview ────────────────────────────────────────────

  /**
   * Jira-style personal work overview: everything assigned to the user
   * that needs doing today, plus unread messages, notifications, pending
   * invites/requests, and recent activity.
   */
  async getForMe(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 3600_000);

    const pmoEnabled = await this.settings.get<boolean>('modules.pmo.enabled');

    const [
      notifications,
      unreadCount,
      invites,
      pendingRequests,
      chatMemberships,
    ] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.projectInvite.findMany({
        where: { invitedUserId: userId, status: 'PENDING' },
        include: { project: { select: { id: true, slug: true, title: true, thumbnailUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.contributionRequest.findMany({
        where: { userId, status: 'PENDING' },
        include: { project: { select: { id: true, slug: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.chatChannelMember.findMany({
        where: { userId, muted: false, channel: { isArchived: false } },
        include: { channel: { select: { id: true, name: true, slug: true, project: { select: { slug: true } } } } },
      }),
    ]);

    // Unread chat messages per channel (single query over all memberships).
    const thresholds = chatMemberships.map((m) => ({
      channelId: m.channelId,
      createdAt: { gt: m.lastReadAt ?? m.joinedAt },
    }));
    const unreadByChannel = thresholds.length
      ? await this.prisma.chatMessage.groupBy({
          by: ['channelId'],
          where: { deletedAt: null, OR: thresholds },
          _count: { _all: true },
        })
      : [];
    const chatUnread = chatMemberships
      .map((m) => ({
        channelId: m.channelId,
        name: m.channel.name,
        projectSlug: m.channel.project?.slug ?? null,
        unread: unreadByChannel.find((u) => u.channelId === m.channelId)?._count._all ?? 0,
      }))
      .filter((c) => c.unread > 0)
      .sort((a, b) => b.unread - a.unread)
      .slice(0, 10);

    // Tasks: overdue, due today, and the rest of the open backlog.
    const taskSelect = {
      id: true,
      key: true,
      title: true,
      dueDate: true,
      priority: true,
      status: { select: { name: true, color: true, category: true } },
      taskList: { select: { id: true, name: true } },
      project: { select: { slug: true, title: true } },
    } as const;

    const [overdueTasks, dueTodayTasks, openTasks] = pmoEnabled
      ? await this.prisma.$transaction([
          this.prisma.task.findMany({
            where: {
              deletedAt: null,
              archivedAt: null,
              assignees: { some: { userId } },
              status: { category: { in: ['TODO', 'IN_PROGRESS'] } },
              dueDate: { lt: todayStart },
              project: { deletedAt: null },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
            select: taskSelect,
          }),
          this.prisma.task.findMany({
            where: {
              deletedAt: null,
              archivedAt: null,
              assignees: { some: { userId } },
              status: { category: { in: ['TODO', 'IN_PROGRESS'] } },
              dueDate: { gte: todayStart, lt: tomorrowStart },
              project: { deletedAt: null },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
            select: taskSelect,
          }),
          this.prisma.task.findMany({
            where: {
              deletedAt: null,
              archivedAt: null,
              assignees: { some: { userId } },
              status: { category: { in: ['TODO', 'IN_PROGRESS'] } },
              OR: [{ dueDate: { gte: tomorrowStart } }, { dueDate: null }],
              project: { deletedAt: null },
            },
            orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
            take: 20,
            select: taskSelect,
          }),
        ])
      : [[], [], []];

    // Recent activity around the user's work.
    const recentActivity = await this.prisma.taskActivity.findMany({
      where: {
        OR: [
          { actorId: userId },
          { task: { assignees: { some: { userId } } } },
          { task: { createdById: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        task: {
          select: {
            id: true,
            key: true,
            title: true,
            project: { select: { slug: true, title: true } },
            taskList: { select: { id: true } },
          },
        },
      },
    });

    return {
      tasks: {
        overdue: overdueTasks,
        dueToday: dueTodayTasks,
        open: openTasks,
      },
      chatUnread,
      notifications: {
        unread: unreadCount,
        recent: notifications,
      },
      invites: invites.map((i) => ({
        id: i.id,
        role: i.role,
        title: i.title,
        createdAt: i.createdAt,
        project: i.project,
      })),
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        role: r.role,
        createdAt: r.createdAt,
        project: r.project,
      })),
      recentActivity,
    };
  }

  async addBookmark(userId: string, projectId: string) {
    const exists = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Project not found.');
    await this.prisma.bookmark.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId },
      update: {},
    });
    return { bookmarked: true };
  }

  async removeBookmark(userId: string, projectId: string) {
    await this.prisma.bookmark
      .delete({ where: { userId_projectId: { userId, projectId } } })
      .catch(() => undefined);
    return { bookmarked: false };
  }

  async listBookmarks(userId: string) {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId, project: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            phase: true,
            visibility: true,
            thumbnailUrl: true,
            thumbnailType: true,
          },
        },
      },
    });
    return rows.map((r) => r.project);
  }

  async getDashboard(userId: string) {
    const [memberships, pendingRequests, bookmarks] = await this.prisma.$transaction([
      this.prisma.projectMember.findMany({
        where: { userId, project: { deletedAt: null } },
        include: {
          project: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              phase: true,
              visibility: true,
              thumbnailUrl: true,
              thumbnailType: true,
              archivedAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.contributionRequest.findMany({
        where: { userId, status: 'PENDING' },
        include: {
          project: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              thumbnailUrl: true,
              thumbnailType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookmark.findMany({
        where: { userId, project: { deletedAt: null } },
        include: {
          project: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              phase: true,
              thumbnailUrl: true,
              thumbnailType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);

    const managed = memberships.filter((m) => m.role === 'PROJECT_MANAGER').map((m) => m.project);
    const contributing = memberships.filter((m) => m.role === 'CONTRIBUTOR').map((m) => m.project);

    const myOpenTasks = await this.getMyOpenTasks(userId);

    return {
      managed,
      contributing,
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        role: r.role,
        message: r.message,
        createdAt: r.createdAt,
        project: r.project,
      })),
      bookmarks: bookmarks.map((b) => b.project),
      myOpenTasks,
    };
  }

  /**
   * Top open PMO tasks assigned to the user, soonest due first. Empty when
   * PMO is disabled so the dashboard widget simply renders nothing.
   */
  private async getMyOpenTasks(userId: string) {
    if (!(await this.settings.get<boolean>('modules.pmo.enabled'))) return [];
    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        assignees: { some: { userId } },
        status: { category: { in: ['TODO', 'IN_PROGRESS'] } },
        project: { deletedAt: null },
      },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 10,
      select: {
        id: true,
        key: true,
        title: true,
        dueDate: true,
        priority: true,
        status: { select: { name: true, color: true, category: true } },
        taskList: { select: { id: true, name: true } },
        project: { select: { slug: true, title: true } },
      },
    });
    return tasks;
  }
}
