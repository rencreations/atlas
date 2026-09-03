import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { StorageMigrationService } from '@/modules/media/storage-migration.service';
import { SsoConnectionDto, SsoConnectionsService } from '@/modules/auth/sso-connections.service';
import { generateTotpSecret, totpAuthUrl, verifyTotpToken } from './totp.util';
import { WebauthnService } from './webauthn.service';

const BCRYPT_ROUNDS = 12;

export interface GodmodeSessionInfo {
  id: string;
  token: string;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

@Injectable()
export class GodmodeService {
  private readonly logger = new Logger(GodmodeService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly webauthn: WebauthnService,
    private readonly storageMigration: StorageMigrationService,
    private readonly ssoConnections: SsoConnectionsService,
  ) {}

  /**
   * Bulk-save settings with one special case: changing `storage.provider`
   * never applies instantly. The other keys are saved, then a background
   * migration starts; the provider flips only when every object has been
   * copied to the new provider. Switching to or from "disabled" applies
   * immediately (there is no source to migrate).
   */
  async bulkSetSettings(entries: { key: string; value: unknown }[]) {
    const providerChange = entries.find((e) => e.key === 'storage.provider');
    const active = await this.settings.get<string>('storage.provider');
    const target = providerChange ? String(providerChange.value) : active;

    if (providerChange && target !== active && target !== 'disabled' && active !== 'disabled') {
      const rest = entries.filter((e) => e.key !== 'storage.provider');
      await this.settings.setMany(rest);
      const migration = await this.storageMigration.start(active, target);
      return { ok: true, storageMigrationStarted: true, migrationId: migration.id };
    }
    await this.settings.setMany(entries);
    return { ok: true };
  }

  // ─── Storage migration (godmode UI) ───────────────────────────────

  storageMigrationStatus() {
    return this.storageMigration.latest();
  }

  retryStorageMigration() {
    return this.storageMigration.retry();
  }

  // ─── SSO connections (tenant directories) ─────────────────────────

  listSsoConnections() {
    return this.ssoConnections.list();
  }

  createSsoConnection(dto: SsoConnectionDto) {
    return this.ssoConnections.create(dto);
  }

  updateSsoConnection(id: string, dto: SsoConnectionDto) {
    return this.ssoConnections.update(id, dto);
  }

  setSsoConnectionEnabled(id: string, enabled: boolean) {
    return this.ssoConnections.setEnabled(id, enabled);
  }

  deleteSsoConnection(id: string) {
    return this.ssoConnections.remove(id);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeCompare(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }

  /**
   * Unlock godmode with the .env passphrase (+ TOTP when enabled).
   * Issues an opaque godmode session token valid for the configured TTL.
   */
  async unlock(
    passphrase: string,
    totp?: string,
    passkey?: { challenge: string; response: AuthenticationResponseJSON },
  ): Promise<GodmodeSessionInfo & { configured: boolean }> {
    const expected = this.config.get<string>('godmode.passphrase', '');
    if (!expected) {
      throw new UnauthorizedException(
        'Godmode is not configured on this deployment. Set GODMODE_PASSPHRASE in .env.',
      );
    }
    if (!this.safeCompare(passphrase, expected)) {
      throw new UnauthorizedException('Incorrect passphrase.');
    }

    // Second factor: TOTP and/or passkeys, whichever the operator set up.
    const [totpEnabled, passkeyEnabled] = await Promise.all([
      this.settings.get<boolean>('godmode.totp.enabled'),
      this.webauthn.isEnabled(),
    ]);
    const secondFactor = totpEnabled || passkeyEnabled;
    let totpVerified = false;
    let passkeyVerified = false;
    if (secondFactor) {
      if (totpEnabled && totp) {
        const secret = await this.settings.get<string>('godmode.totp.secret');
        if (!secret || !this.verifyTotp(secret, totp)) {
          throw new UnauthorizedException('Invalid TOTP code.');
        }
        totpVerified = true;
      } else if (passkeyEnabled && passkey) {
        await this.webauthn.verifyAuthentication(passkey.challenge, passkey.response);
        passkeyVerified = true;
      } else {
        throw new UnauthorizedException(
          passkeyEnabled ? 'Second factor required: TOTP code or passkey.' : 'TOTP code required.',
        );
      }
    }

    const ttlMinutes = await this.settings.get<number>('godmode.sessionTtlMinutes');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    const session = await this.prisma.godmodeSession.create({
      data: {
        tokenHash: this.hashToken(token),
        expiresAt,
        metadata: { method: 'passphrase', totp: totpVerified, passkey: passkeyVerified },
      },
    });

    this.logger.log(`Godmode unlocked (session ${session.id})`);

    return {
      id: session.id,
      token,
      expiresAt,
      metadata: { totp: totpVerified, passkey: passkeyVerified },
      configured: await this.settings.isConfigured(),
    };
  }

  async validateToken(
    token: string,
  ): Promise<{ id: string; expiresAt: Date; metadata: unknown } | null> {
    if (!token) return null;
    const session = await this.prisma.godmodeSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.godmodeSession
          .delete({ where: { id: session.id } })
          .catch(() => undefined);
      }
      return null;
    }
    return { id: session.id, expiresAt: session.expiresAt, metadata: session.metadata };
  }

  async revokeToken(token: string): Promise<void> {
    await this.prisma.godmodeSession
      .delete({ where: { tokenHash: this.hashToken(token) } })
      .catch(() => undefined);
  }

  async deleteExpired(): Promise<number> {
    const res = await this.prisma.godmodeSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }

  // ─── TOTP (second factor) ──────────────────────────────────────────

  async generateTotpSecret(): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = generateTotpSecret();
    const siteName = (await this.settings.get<string>('site.name')).replace(/\s+/g, '');
    const otpauthUrl = totpAuthUrl(secret, 'Atlas godmode', siteName || 'Atlas');
    return { secret, otpauthUrl };
  }

  async enableTotp(secret: string, code: string): Promise<void> {
    if (!verifyTotpToken(secret, code)) {
      throw new UnauthorizedException('Invalid TOTP code, try again.');
    }
    await this.settings.set('godmode.totp.secret', secret);
    await this.settings.set('godmode.totp.enabled', true);
  }

  async disableTotp(): Promise<void> {
    await this.settings.set('godmode.totp.enabled', false);
    await this.settings.set('godmode.totp.secret', '');
  }

  private verifyTotp(secret: string, code: string): boolean {
    return verifyTotpToken(secret, code);
  }

  // ─── Passkeys (delegated to WebauthnService) ───────────────────────

  hasPasskeys(): Promise<boolean> {
    return this.webauthn.isEnabled();
  }

  listPasskeys() {
    return this.webauthn.listPasskeys();
  }

  deletePasskey(id: string): Promise<void> {
    return this.webauthn.deletePasskey(id);
  }

  passkeyRegistrationOptions() {
    return this.webauthn.registrationOptions();
  }

  verifyPasskeyRegistration(challenge: string, response: RegistrationResponseJSON) {
    return this.webauthn.verifyRegistration(challenge, response);
  }

  passkeyAuthenticationOptions() {
    return this.webauthn.authenticationOptions();
  }

  // ─── Onboarding user creation ──────────────────────────────────────

  async listUsers(search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
        emailVerified: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        suspendedAt: true,
        suspendedReason: true,
        userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
      },
    });
  }

  /**
   * Create a user account from godmode. Before onboarding completes, only
   * the first superadmin account may be created, that account becomes the
   * instance owner.
   */
  async createUser(dto: {
    email: string;
    name: string;
    password?: string;
    roleCode?: string;
  }): Promise<{ id: string; email: string; name: string }> {
    const email = dto.email.toLowerCase().trim();
    if (!email) throw new UnauthorizedException('Email is required.');

    const configured = await this.settings.isConfigured();
    const roleCode = configured ? (dto.roleCode ?? 'member') : 'superadmin';

    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new ConflictException(`Unknown role: ${roleCode}`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with that email already exists.');

    const minLen = await this.settings.get<number>('auth.passwordMinLength');
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS) : null;
    if (dto.password && dto.password.length < minLen) {
      throw new UnauthorizedException(`Password must be at least ${minLen} characters.`);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name || email.split('@')[0],
        emailVerified: true,
        isAdmin: roleCode === 'superadmin' || roleCode === 'admin',
        identities: { create: { provider: 'password', providerId: email } },
        ...(passwordHash
          ? {
              passwordCredential: {
                create: {
                  passwordHash,
                  // The onboarding superadmin just picked this password;
                  // later admin-provisioned accounts follow the policy.
                  mustChange:
                    configured &&
                    (await this.settings.get<boolean>('auth.forcePasswordChangeOnProvision')),
                },
              },
            }
          : {}),
        userRoles: { create: { roleId: role.id } },
      },
      select: { id: true, email: true, name: true },
    });

    this.logger.log(`Godmode created user ${user.id} (${email}, role ${roleCode})`);
    return user;
  }

  async grantRole(userId: string, roleCode: string, grantedBy?: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ConflictException(`Unknown role: ${roleCode}`);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ConflictException('User not found.');

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id, grantedById: grantedBy },
      update: {},
    });

    // Keep the legacy flag in sync so existing guards keep working.
    if (roleCode === 'superadmin' || roleCode === 'admin') {
      await this.prisma.user.update({ where: { id: userId }, data: { isAdmin: true } });
    }
  }

  /** Single-use registration invite code (email-bound when provided). */
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

  async revokeRole(userId: string, roleCode: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ConflictException(`Unknown role: ${roleCode}`);
    await this.prisma.userRole
      .deleteMany({ where: { userId, roleId: role.id } })
      .catch(() => undefined);

    if (roleCode === 'superadmin' || roleCode === 'admin') {
      const remaining = await this.prisma.userRole.findMany({
        where: { userId, role: { code: { in: ['superadmin', 'admin'] } } },
      });
      if (remaining.length === 0) {
        await this.prisma.user.update({ where: { id: userId }, data: { isAdmin: false } });
      }
    }
  }

  // ─── Account moderation ────────────────────────────────────────────

  /** First superadmin who is not `excludeId`; content gets reassigned to them. */
  private async fallbackSuperadminId(excludeId?: string): Promise<string | null> {
    const grant = await this.prisma.userRole.findFirst({
      where: { role: { code: 'superadmin' }, ...(excludeId ? { userId: { not: excludeId } } : {}) },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    return grant?.userId ?? null;
  }

  async suspendUser(
    userId: string,
    message: string | undefined,
    operatorSessionId?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.suspendedAt) throw new ConflictException('User is already suspended.');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          suspendedAt: new Date(),
          suspendedReason: message?.trim() || 'Contact the workspace administrator.',
          suspendedById: operatorSessionId,
        },
      }),
      // Sessions are deleted so the suspension takes effect immediately.
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    this.logger.log(`Godmode suspended user ${userId} (${user.email})`);
  }

  async unsuspendUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null, suspendedReason: null, suspendedById: null },
    });
    this.logger.log(`Godmode unsuspended user ${userId} (${user.email})`);
  }

  /**
   * Hard-delete a user account and every personal row. Content that must
   * keep an owner (projects, channels, tasks, files, notes, whiteboards,
   * stickers, soundboard clips, recordings) is reassigned to the first
   * remaining superadmin; their chat messages and task comments are
   * removed. Refuses to delete the last superadmin.
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const isSuperadmin = await this.prisma.userRole.count({
      where: { userId, role: { code: 'superadmin' } },
    });
    if (isSuperadmin > 0) {
      const other = await this.fallbackSuperadminId(userId);
      if (!other) {
        throw new BadRequestException(
          'This is the last superadmin. Grant superadmin to another user before deleting this account.',
        );
      }
    }
    const reassignTo = await this.fallbackSuperadminId(userId);
    if (!reassignTo) {
      throw new BadRequestException('No remaining superadmin to reassign this user content to.');
    }

    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.userAuthIdentity.deleteMany({ where: { userId } }),
      this.prisma.passwordCredential.deleteMany({ where: { userId } }),
      this.prisma.userRole.deleteMany({ where: { OR: [{ userId }, { grantedById: userId }] } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      this.prisma.voiceUserPreferences.deleteMany({ where: { userId } }),
      this.prisma.bookmark.deleteMany({ where: { userId } }),
      this.prisma.projectMember.deleteMany({ where: { userId } }),
      this.prisma.projectInvite.deleteMany({
        where: { OR: [{ invitedUserId: userId }, { invitedById: userId }] },
      }),
      this.prisma.contributionRequest.deleteMany({ where: { userId } }),
      this.prisma.contributionRequest.updateMany({
        where: { resolvedById: userId },
        data: { resolvedById: null },
      }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.chatChannelMember.deleteMany({ where: { userId } }),
      this.prisma.chatReaction.deleteMany({ where: { userId } }),
      this.prisma.chatPinned.deleteMany({ where: { pinnedById: userId } }),
      this.prisma.chatMessage.updateMany({
        where: { deletedByUserId: userId },
        data: { deletedByUserId: null },
      }),
      this.prisma.chatMessage.deleteMany({ where: { authorId: userId } }),
      this.prisma.chatChannel.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.stickerPack.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.taskAssignee.deleteMany({ where: { userId } }),
      this.prisma.taskComment.deleteMany({ where: { authorId: userId } }),
      this.prisma.task.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.taskAttachment.updateMany({
        where: { uploadedById: userId },
        data: { uploadedById: reassignTo },
      }),
      this.prisma.taskCommentAttachment.updateMany({
        where: { uploadedById: userId },
        data: { uploadedById: reassignTo },
      }),
      this.prisma.projectFile.updateMany({
        where: { uploadedById: userId },
        data: { uploadedById: reassignTo },
      }),
      this.prisma.projectNote.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.whiteboard.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.project.updateMany({
        where: { ownerId: userId },
        data: { ownerId: reassignTo },
      }),
      this.prisma.featuredProject.updateMany({
        where: { setById: userId },
        data: { setById: reassignTo },
      }),
      this.prisma.voiceChannel.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignTo },
      }),
      this.prisma.voiceParticipant.deleteMany({ where: { userId } }),
      this.prisma.voiceRecording.updateMany({
        where: { startedByUserId: userId },
        data: { startedByUserId: reassignTo },
      }),
      this.prisma.voiceSoundboardClip.updateMany({
        where: { uploadedById: userId },
        data: { uploadedById: reassignTo },
      }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    this.logger.log(`Godmode deleted user ${userId} (${user.email})`);
  }

  /** Set (or reset) a local password for any account. */
  async resetUserPassword(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const minLen = await this.settings.get<number>('auth.passwordMinLength');
    if (password.length < minLen) {
      throw new BadRequestException(`Password must be at least ${minLen} characters.`);
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.passwordCredential.upsert({
        where: { userId },
        create: { userId, passwordHash, mustChange: true },
        update: { passwordHash, mustChange: true },
      }),
      this.prisma.userAuthIdentity.upsert({
        where: { provider_providerId: { provider: 'password', providerId: user.email } },
        create: { userId, provider: 'password', providerId: user.email },
        update: {},
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordChangedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    this.logger.log(`Godmode reset the password for ${user.email}`);
  }

  /** Sign the user out of every device. */
  async revokeUserSessions(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    await this.prisma.session.deleteMany({ where: { userId } });
    this.logger.log(`Godmode revoked all sessions for ${user.email}`);
  }

  /** Create a custom role with a generated code derived from its name. */
  async createRole(dto: {
    name: string;
    description?: string;
    permissions: string[];
  }): Promise<{ code: string }> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Role name is required.');
    const code = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (!code) throw new BadRequestException('Role name must contain letters or numbers.');
    const existing = await this.prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`A role with the code "${code}" already exists.`);
    }
    const known = await this.prisma.permission.findMany({ select: { code: true } });
    const knownCodes = new Set(known.map((p) => p.code));
    const unknown = dto.permissions.filter((p) => !knownCodes.has(p));
    if (unknown.length > 0) {
      throw new ConflictException(`Unknown permissions: ${unknown.join(', ')}`);
    }
    await this.prisma.role.create({
      data: {
        code,
        name,
        description: dto.description,
        permissions: dto.permissions,
        isSystem: false,
      },
    });
    return { code };
  }

  async listRoles() {
    return this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      include: { _count: { select: { userRoles: true } } },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { code: 'asc' }] });
  }

  async upsertRole(dto: {
    code: string;
    name: string;
    description?: string;
    permissions: string[];
  }): Promise<void> {
    const known = await this.prisma.permission.findMany({ select: { code: true } });
    const knownCodes = new Set(known.map((p) => p.code));
    const unknown = dto.permissions.filter((p) => !knownCodes.has(p));
    if (unknown.length > 0) {
      throw new ConflictException(`Unknown permissions: ${unknown.join(', ')}`);
    }
    await this.prisma.role.upsert({
      where: { code: dto.code },
      create: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        isSystem: false,
      },
      update: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
      },
    });
  }

  async deleteRole(roleCode: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) return;
    if (role.isSystem) throw new ConflictException('System roles cannot be deleted.');
    if (role._count.userRoles > 0) {
      throw new ConflictException('Role is still assigned to users.');
    }
    await this.prisma.role.delete({ where: { code: roleCode } });
  }
}
