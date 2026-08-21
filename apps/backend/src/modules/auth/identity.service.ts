import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';

export interface ExternalProfile {
  /** External subject id (OAuth/OIDC sub, SAML nameid, ...). */
  providerId: string;
  email?: string;
  name?: string;
  picture?: string;
  bio?: string;
}

export interface SessionUser {
  id: string;
  keycloakId: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  emailVerified?: boolean;
}

const SESSION_USER_SELECT = {
  id: true,
  keycloakId: true,
  email: true,
  name: true,
  avatarUrl: true,
  isAdmin: true,
} satisfies Prisma.UserSelect;

/**
 * Upserts users by external identity and mints consistent user blobs for
 * session responses. Handles the cross-provider rules:
 *
 * - A known identity (provider, providerId) maps to its user.
 * - A known email links the new identity to the existing user.
 * - New users get the registration default role and a Gravatar fallback
 *   avatar until they override it in their profile.
 */
@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  gravatarUrl(email: string): string {
    const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&r=g`;
  }

  /** Find a user by one of their identities (provider + provider id). */
  findByIdentity(provider: string, providerId: string) {
    return this.prisma.userAuthIdentity.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: { select: SESSION_USER_SELECT } },
    });
  }

  /**
   * Upsert a user from an external profile, linking identities by email
   * when the account already exists. Never overwrites an existing name,
   * bio, or a user-uploaded avatar with provider data.
   */
  async upsertFromExternal(provider: string, profile: ExternalProfile): Promise<SessionUser> {
    const linked = await this.findByIdentity(provider, profile.providerId);
    if (linked) {
      return linked.user as unknown as SessionUser;
    }

    const email = (profile.email ?? '').toLowerCase().trim();
    if (email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { ...SESSION_USER_SELECT, avatarS3Key: true },
      });
      if (byEmail) {
        // Link the new provider identity to the existing account.
        await this.prisma.userAuthIdentity.create({
          data: { userId: byEmail.id, provider, providerId: profile.providerId },
        });
        const user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            lastLoginAt: new Date(),
            // Provider data fills gaps only.
            ...(byEmail.name === email.split('@')[0] && profile.name ? { name: profile.name } : {}),
            ...(!byEmail.avatarUrl && !byEmail.avatarS3Key && profile.picture
              ? { avatarUrl: profile.picture }
              : {}),
          },
          select: SESSION_USER_SELECT,
        });
        return user as unknown as SessionUser;
      }
    }

    const defaultRoleCode = await this.settings.get<string>('registration.defaultRole');
    const defaultRole = await this.prisma.role.findUnique({
      where: { code: defaultRoleCode },
    });
    const isAdminRole = defaultRoleCode === 'admin' || defaultRoleCode === 'superadmin';

    const user = await this.prisma.user.create({
      data: {
        email: email || `${provider}-${profile.providerId.slice(0, 40)}@local`,
        name: profile.name || email.split('@')[0] || 'New user',
        avatarUrl: profile.picture ?? (email ? this.gravatarUrl(email) : null),
        emailVerified: true,
        isAdmin: isAdminRole,
        lastLoginAt: new Date(),
        identities: { create: { provider, providerId: profile.providerId } },
        ...(defaultRole ? { userRoles: { create: { roleId: defaultRole.id } } } : {}),
      },
      select: SESSION_USER_SELECT,
    });
    return user as unknown as SessionUser;
  }
}
