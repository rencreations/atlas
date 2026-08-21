import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oidc from 'openid-client';
import { SettingsService } from '@/modules/settings/settings.service';
import { ExternalProfile, IdentityService, SessionUser } from './identity.service';

interface OidcState {
  nonce: string;
  state: string;
}

/**
 * Generic OpenID Connect SSO against any discovery-compatible IdP
 * (Okta, Entra ID, Keycloak, Zitadel, ...). Config lives in godmode
 * (sso.oidc.*); discovery configurations are cached per issuer.
 */
@Injectable()
export class OIDCService {
  private readonly logger = new Logger(OIDCService.name);
  private configurations = new Map<string, oidc.Configuration>();

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly identity: IdentityService,
  ) {}

  async isEnabled(): Promise<boolean> {
    return this.settings.get<boolean>('sso.oidc.enabled');
  }

  private backendBaseUrl(): string {
    return this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000';
  }

  callbackUrl(): string {
    return `${this.backendBaseUrl().replace(/\/+$/, '')}/api/v1/auth/oidc/callback`;
  }

  private jwtSecret(): string {
    return this.config.getOrThrow<string>('jwt.internalSecret');
  }

  private async configuration(): Promise<oidc.Configuration> {
    const issuerUrl = (await this.settings.get<string>('sso.oidc.issuer')).replace(/\/+$/, '');
    if (!issuerUrl) {
      throw new UnauthorizedException('OIDC SSO is not configured. Set the issuer in godmode.');
    }
    const cached = this.configurations.get(issuerUrl);
    if (cached) return cached;

    const clientId = await this.settings.get<string>('sso.oidc.clientId');
    const clientSecret = await this.settings.get<string>('sso.oidc.clientSecret');
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'OIDC SSO is not configured. Set the client id and secret in godmode.',
      );
    }
    try {
      const configuration = await oidc.discovery(
        new URL(issuerUrl),
        clientId,
        clientSecret,
        undefined,
        {
          // Self-hosted IdPs over plain HTTP (e.g. a LAN Keycloak) are a
          // legitimate setup; production instances should use TLS.
          execute: [oidc.allowInsecureRequests],
        },
      );
      this.configurations.set(issuerUrl, configuration);
      return configuration;
    } catch (err) {
      this.logger.warn(`OIDC discovery failed for ${issuerUrl}: ${(err as Error).message}`);
      throw new UnauthorizedException(
        'Could not reach the OIDC issuer. Check the issuer URL in godmode.',
      );
    }
  }

  async start(callbackUrl?: string): Promise<string> {
    const configuration = await this.configuration();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const url = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.callbackUrl(),
      scope: 'openid email profile',
      state,
      nonce,
      ...(callbackUrl ? { resource: callbackUrl } : {}),
    });
    return url.toString();
  }

  /**
   * Complete the OIDC code flow. `reqUrl` is the full callback request
   * URL (openid-client parses the query from it).
   */
  async handleCallback(reqUrl: string): Promise<{ user: SessionUser; returnTo: string | null }> {
    const configuration = await this.configuration();
    const currentUrl = new URL(reqUrl, this.backendBaseUrl());
    if (currentUrl.searchParams.has('error')) {
      throw new BadRequestException(
        `The IdP rejected the sign-in: ${currentUrl.searchParams.get('error_description') ?? currentUrl.searchParams.get('error')}`,
      );
    }
    let response;
    try {
      response = await oidc.authorizationCodeGrant(configuration, currentUrl, {
        expectedState: currentUrl.searchParams.get('state') ?? undefined,
      });
    } catch (err) {
      this.logger.warn(`OIDC callback failed: ${(err as Error).message}`);
      throw new UnauthorizedException('OIDC sign-in failed — please try again.');
    }

    const claims = response.claims();
    if (!claims.sub) throw new UnauthorizedException('Missing subject in OIDC tokens.');

    let userinfo: Record<string, unknown> = claims;
    try {
      const info = await oidc.fetchUserInfo(configuration, response.access_token, claims.sub);
      if (info && info.sub === claims.sub) userinfo = { ...claims, ...info };
    } catch {
      // userinfo is best-effort enrichment; token claims already verified.
    }

    const profile: ExternalProfile = {
      providerId: String(userinfo.sub),
      email: typeof userinfo.email === 'string' ? userinfo.email : undefined,
      name:
        typeof userinfo.name === 'string' && userinfo.name
          ? userinfo.name
          : [userinfo.given_name, userinfo.family_name].filter(Boolean).join(' ').trim() ||
            String(userinfo.preferred_username ?? ''),
      picture: typeof userinfo.picture === 'string' ? userinfo.picture : undefined,
    };
    const user = await this.identity.upsertFromExternal('oidc', profile);
    return { user, returnTo: null };
  }
}
