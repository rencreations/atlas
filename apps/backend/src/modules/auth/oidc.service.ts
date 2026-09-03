import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as oidc from 'openid-client';
import { SettingsService } from '@/modules/settings/settings.service';
import { ExternalProfile, IdentityService, SessionUser } from './identity.service';
import { SsoConnectionRow } from './sso-connections.service';

interface OidcState {
  nonce: string;
  state: string;
}

type OidcModule = typeof oidc;

// openid-client v6 ships ESM-only. This app compiles to CommonJS, and
// TypeScript's `module: commonjs` target downlevels `import()` to a
// `require()` call, which throws ERR_REQUIRE_ESM on this package just
// like a static import would. Routing through `Function` hides the
// `import()` from that downleveling so it runs as a real dynamic import.
let oidcModulePromise: Promise<OidcModule> | null = null;
function loadOidc(): Promise<OidcModule> {
  oidcModulePromise ??= new Function('return import("openid-client")')() as Promise<OidcModule>;
  return oidcModulePromise;
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

  /** Per-connection callback URL (tenant SSO directories). */
  callbackUrlFor(connectionId: string): string {
    return `${this.backendBaseUrl().replace(/\/+$/, '')}/api/v1/auth/sso/${connectionId}/oidc/callback`;
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
      const oidc = await loadOidc();
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
    const oidc = await loadOidc();
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
    return this.completeWithConfiguration(configuration, reqUrl, 'oidc');
  }

  // ─── Tenant SSO connections ───────────────────────────────────────

  /** Discovery configuration for one tenant connection (cached by id + issuer). */
  async configurationFor(conn: SsoConnectionRow): Promise<oidc.Configuration> {
    const issuerUrl = (conn.config.issuer ?? '').replace(/\/+$/, '');
    if (!issuerUrl) {
      throw new UnauthorizedException('This SSO connection has no issuer URL.');
    }
    const cacheKey = `${conn.id}|${issuerUrl}`;
    const cached = this.configurations.get(cacheKey);
    if (cached) return cached;

    const clientId = conn.config.clientId ?? '';
    const clientSecret = conn.config.clientSecret ?? '';
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'This SSO connection is missing its client id or secret. Check it in godmode.',
      );
    }
    try {
      const oidc = await loadOidc();
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
      this.configurations.set(cacheKey, configuration);
      return configuration;
    } catch (err) {
      this.logger.warn(`OIDC discovery failed for ${issuerUrl}: ${(err as Error).message}`);
      throw new UnauthorizedException(
        'Could not reach the OIDC issuer. Check the issuer URL in godmode.',
      );
    }
  }

  async startFor(conn: SsoConnectionRow): Promise<string> {
    const configuration = await this.configurationFor(conn);
    const oidc = await loadOidc();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const url = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.callbackUrlFor(conn.id),
      scope: 'openid email profile',
      state,
      nonce,
    });
    return url.toString();
  }

  async handleCallbackFor(
    conn: SsoConnectionRow,
    reqUrl: string,
  ): Promise<{ user: SessionUser; returnTo: string | null }> {
    const configuration = await this.configurationFor(conn);
    return this.completeWithConfiguration(configuration, reqUrl, `sso:${conn.id}`);
  }

  private async completeWithConfiguration(
    configuration: oidc.Configuration,
    reqUrl: string,
    identityProvider: string,
  ): Promise<{ user: SessionUser; returnTo: string | null }> {
    const oidc = await loadOidc();
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
      throw new UnauthorizedException('OIDC sign-in failed, please try again.');
    }

    const claims = response.claims();
    if (!claims?.sub) throw new UnauthorizedException('Missing subject in OIDC tokens.');

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
    const user = await this.identity.upsertFromExternal(identityProvider, profile);
    return { user, returnTo: null };
  }
}
