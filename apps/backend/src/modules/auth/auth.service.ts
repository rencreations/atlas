import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { PrismaService } from '@/prisma/prisma.service';
import { IdentityService, SessionUser } from './identity.service';
import { SessionService } from './session.service';

interface KeycloakClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Shared session issuance for every auth flow. All logins converge on
 * `issueSession` so the frontend receives one consistent shape:
 * `{ sessionId, expiresAt, user }` (stored in localStorage).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly sessions: SessionService,
  ) {}

  /**
   * Upsert the user record from a freshly validated Keycloak token
   * (legacy labmgm flow). Admin status now comes from roles, not the
   * bootstrap env var.
   */
  async syncUserFromToken(claims: KeycloakClaims): Promise<AuthenticatedUser> {
    const user = await this.identity.upsertFromExternal('keycloak', {
      providerId: claims.sub,
      email: claims.email,
      name: this.resolveDisplayName(claims),
      picture: claims.picture,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { keycloakId: claims.sub, lastLoginAt: new Date() },
    });
    return user as AuthenticatedUser;
  }

  /**
   * Sync user from Keycloak token data sent by the frontend.
   * Used when creating a database session.
   */
  async syncUserFromTokenData(data: {
    keycloakId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<AuthenticatedUser> {
    const user = await this.identity.upsertFromExternal('keycloak', {
      providerId: data.keycloakId,
      email: data.email,
      name: data.name,
      picture: data.picture,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { keycloakId: data.keycloakId, lastLoginAt: new Date() },
    });
    return user as AuthenticatedUser;
  }

  private resolveDisplayName(claims: KeycloakClaims): string {
    if (claims.name && claims.name.trim()) return claims.name.trim();
    const composed = [claims.given_name, claims.family_name].filter(Boolean).join(' ').trim();
    if (composed) return composed;
    if (claims.preferred_username) return claims.preferred_username;
    return claims.email ?? 'Unknown';
  }

  /**
   * Mint a database session for a resolved user. Returns the exact
   * response shape the frontend expects from every login endpoint.
   */
  async issueSession(
    user: SessionUser,
    opts?: {
      method?: string;
      accessToken?: string | null;
      refreshToken?: string | null;
      idToken?: string | null;
    },
    req?: Request,
  ): Promise<{
    sessionId: string;
    expiresAt: Date;
    user: SessionUser;
    mustChangePassword?: boolean;
  }> {
    const { sessionId, expiresAt } = await this.sessions.createSession(user.id, {
      method: opts?.method,
      accessToken: opts?.accessToken,
      refreshToken: opts?.refreshToken,
      idToken: opts?.idToken,
      userAgent: req?.get('user-agent')?.slice(0, 300),
      ip: (req?.ip ?? req?.socket?.remoteAddress ?? null) as string | null,
    });
    return { sessionId, expiresAt, user };
  }
}
