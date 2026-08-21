import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createSign, randomBytes } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { SettingsService } from '@/modules/settings/settings.service';
import { ExternalProfile, IdentityService, SessionUser } from './identity.service';

interface StatePayload {
  provider: string;
  callbackUrl?: string;
  nonce: string;
  pkceVerifier?: string;
}

interface OAuthFlowConfig {
  id: string;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl?: string;
  scopes: string;
  /** Provider quirks for the token request. */
  tokenExtra?: Record<string, string>;
  tokenMethod?: 'POST' | 'GET';
  tokenAuth?: 'body' | 'basic' | 'apple-jwt';
  tokenAcceptJson?: boolean;
  userinfoExtraHeaders?: Record<string, string>;
  /** Extra claims merged into the authorize URL (e.g. response_mode). */
  authorizeExtra?: Record<string, string>;
  requiresPkce?: boolean;
  profileFromIdToken?: boolean;
  mapProfile: (payload: Record<string, unknown>, cfg: { providerId: string }) => ExternalProfile;
}

/** OAuthFlowConfig with resolved credentials + provider extras. */
type ResolvedOAuthConfig = OAuthFlowConfig & {
  clientId: string;
  clientSecret: string;
  extra: Record<string, string>;
};

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Convert a DER-encoded ECDSA signature to JOSE raw R||S (64 bytes). */
function derToJoseEcdsa(der: Buffer): Buffer {
  let offset = 2; // skip 0x30 len
  const readInt = (): Buffer => {
    if (der[offset] !== 0x02) throw new Error('Malformed DER signature.');
    const len = der[offset + 1];
    offset += 2;
    const val = der.subarray(offset, offset + len);
    offset += len;
    return val;
  };
  const r = readInt();
  const s = readInt();
  const pad = (buf: Buffer): Buffer =>
    buf.length > 32
      ? buf.subarray(buf.length - 32)
      : Buffer.concat([Buffer.alloc(32 - buf.length), buf]);
  return Buffer.concat([pad(r), pad(s)]);
}

function appleClientSecretJwt(
  teamId: string,
  keyId: string,
  clientId: string,
  privateKey: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId };
  const claims = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(claims)))}`;
  // Apple requires ES256 in JOSE (raw R||S) form.
  const signer = createSign('SHA256').update(signingInput);
  let signature: Buffer;
  try {
    signature = derToJoseEcdsa(signer.sign(privateKey));
  } catch {
    signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  }
  return `${signingInput}.${b64url(signature)}`;
}

/**
 * Generic OAuth2 engine with per-provider presets. Credentials and
 * enablement come from godmode settings (auth.oauth.<id>.*). Start URLs
 * carry an HMAC-signed state token; callbacks validate it before
 * exchanging the code and never trust provider-returned identity data
 * until it has been fetched from the provider's userinfo endpoint.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly identity: IdentityService,
  ) {}

  private jwtSecret(): string {
    return this.config.getOrThrow<string>('jwt.internalSecret');
  }

  private backendBaseUrl(): string {
    return this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000';
  }

  callbackUrlFor(providerId: string): string {
    return `${this.backendBaseUrl().replace(/\/+$/, '')}/api/v1/auth/oauth/${providerId}/callback`;
  }

  private async signState(payload: StatePayload): Promise<string> {
    return jwt.sign(payload, this.jwtSecret(), { expiresIn: '10m', issuer: 'atlas-oauth' });
  }

  private verifyState(state: string, expectedProvider: string): StatePayload {
    try {
      const payload = jwt.verify(state, this.jwtSecret(), {
        issuer: 'atlas-oauth',
      }) as StatePayload;
      if (payload.provider !== expectedProvider) throw new Error('provider mismatch');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state — please try again.');
    }
  }

  /** Build the provider's authorize URL and redirect the browser there. */
  async start(providerId: string, callbackUrl?: string): Promise<string> {
    const cfg = await this.configFor(providerId);
    const nonce = randomBytes(16).toString('hex');
    const pkceVerifier = cfg.requiresPkce ? b64url(randomBytes(48)) : undefined;
    const state = await this.signState({ provider: providerId, callbackUrl, nonce, pkceVerifier });

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: this.callbackUrlFor(providerId),
      response_type: 'code',
      scope: cfg.scopes,
      state,
      nonce,
    });
    if (cfg.requiresPkce && pkceVerifier) {
      params.set('code_challenge', b64url(createHash('sha256').update(pkceVerifier).digest()));
      params.set('code_challenge_method', 'S256');
    }
    if (cfg.authorizeExtra) {
      for (const [k, v] of Object.entries(cfg.authorizeExtra)) params.set(k, v);
    }
    return `${cfg.authorizeUrl}?${params.toString()}`;
  }

  /**
   * Exchange the authorization code and resolve the profile.
   * `formBody` carries POST form callbacks (Apple uses form_post).
   */
  async handleCallback(
    providerId: string,
    code: string | undefined,
    state: string | undefined,
    formBody?: Record<string, string>,
  ): Promise<{ user: SessionUser; returnTo: string | null }> {
    const statePayload = state
      ? this.verifyState(state, providerId)
      : ({ provider: providerId } as StatePayload);
    const cfg = await this.configFor(providerId);

    const effectiveCode = code ?? formBody?.code;
    if (!effectiveCode) {
      throw new BadRequestException('Missing authorization code.');
    }
    if (formBody?.error) {
      throw new UnauthorizedException(`Provider rejected the sign-in: ${formBody.error}`);
    }

    const token = await this.exchangeCode(cfg, effectiveCode, statePayload);
    const profile = await this.fetchProfile(cfg, token);
    const user = await this.identity.upsertFromExternal(`oauth:${providerId}`, profile);
    return { user, returnTo: statePayload.callbackUrl ?? null };
  }

  // ─── Token exchange ───────────────────────────────────────────────

  private async exchangeCode(
    cfg: ResolvedOAuthConfig,
    code: string,
    state: StatePayload,
  ): Promise<{ access_token: string; id_token?: string }> {
    const baseParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrlFor(cfg.id),
    };

    let headers: Record<string, string> = {};
    let body: string;
    const url = cfg.tokenUrl;

    switch (cfg.tokenAuth) {
      case 'basic':
        headers = {
          authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        };
        body = new URLSearchParams({
          ...baseParams,
          client_id: cfg.clientId,
          ...(cfg.requiresPkce && state.pkceVerifier ? { code_verifier: state.pkceVerifier } : {}),
          ...(cfg.tokenExtra ?? {}),
        }).toString();
        break;
      case 'apple-jwt': {
        const secret = appleClientSecretJwt(
          cfg.extra.teamId,
          cfg.extra.keyId,
          cfg.clientId,
          cfg.extra.privateKey,
        );
        headers = { 'content-type': 'application/x-www-form-urlencoded' };
        body = new URLSearchParams({
          ...baseParams,
          client_id: cfg.clientId,
          client_secret: secret,
        }).toString();
        break;
      }
      case 'body':
      default:
        headers = { 'content-type': 'application/x-www-form-urlencoded' };
        body = new URLSearchParams({
          ...baseParams,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          ...(cfg.requiresPkce && state.pkceVerifier ? { code_verifier: state.pkceVerifier } : {}),
          ...(cfg.tokenExtra ?? {}),
        }).toString();
        break;
    }
    if (cfg.tokenAcceptJson) headers.accept = 'application/json';

    const res = await fetch(url, {
      method: cfg.tokenMethod === 'GET' ? 'GET' : 'POST',
      headers,
      body: cfg.tokenMethod === 'GET' ? undefined : body,
      ...(cfg.tokenMethod === 'GET' ? {} : {}),
    });
    // Facebook returns tokens on a GET request with query params.
    if (cfg.tokenMethod === 'GET') {
      const fbUrl = new URL(url);
      Object.entries({
        ...baseParams,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }).forEach(([k, v]) => fbUrl.searchParams.set(k, v));
      const fbRes = await fetch(fbUrl.toString());
      const data = (await fbRes.json()) as Record<string, unknown>;
      if (fbRes.ok && data.access_token) return { access_token: String(data.access_token) };
      throw new UnauthorizedException(`Provider token exchange failed: ${JSON.stringify(data)}`);
    }

    const raw = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      data = Object.fromEntries(new URLSearchParams(raw));
    }
    if (!res.ok || !data.access_token) {
      this.logger.warn(
        `OAuth token exchange failed for ${cfg.id}: ${res.status} ${raw.slice(0, 200)}`,
      );
      throw new UnauthorizedException('Provider rejected the authorization code.');
    }
    return {
      access_token: String(data.access_token),
      ...(typeof data.id_token === 'string' ? { id_token: data.id_token } : {}),
    };
  }

  // ─── Profile fetch ────────────────────────────────────────────────

  private async fetchProfile(
    cfg: ResolvedOAuthConfig,
    token: { access_token: string; id_token?: string },
  ): Promise<ExternalProfile> {
    // Apple (and providers with profileFromIdToken) carry the identity
    // in the signed ID token rather than a userinfo endpoint.
    if (cfg.profileFromIdToken && token.id_token) {
      const claims = jwt.decode(token.id_token) as Record<string, unknown>;
      if (!claims.sub) throw new UnauthorizedException('Missing subject in provider ID token.');
      return cfg.mapProfile(claims, { providerId: String(claims.sub) });
    }
    if (!cfg.userinfoUrl) {
      throw new UnauthorizedException('Provider has no userinfo endpoint configured.');
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${token.access_token}`,
      ...(cfg.userinfoExtraHeaders ?? {}),
    };
    const res = await fetch(cfg.userinfoUrl, { headers });
    if (!res.ok) {
      this.logger.warn(`OAuth userinfo failed for ${cfg.id}: ${res.status}`);
      throw new UnauthorizedException('Could not load your profile from the provider.');
    }
    const payload = (await res.json()) as Record<string, unknown>;
    return cfg.mapProfile(payload, { providerId: String(payload.sub ?? payload.id ?? '') });
  }

  // ─── Provider presets & config ────────────────────────────────────

  private async configFor(providerId: string): Promise<ResolvedOAuthConfig> {
    const preset = PROVIDERS[providerId];
    if (!preset) throw new BadRequestException(`Unknown OAuth provider: ${providerId}`);
    if (!(await this.settings.get<boolean>(`auth.oauth.${providerId}.enabled`))) {
      throw new UnauthorizedException(`${preset.label} sign-in is disabled on this instance.`);
    }
    const clientId = await this.settings.get<string>(`auth.oauth.${providerId}.clientId`);
    const clientSecret = await this.settings.get<string>(`auth.oauth.${providerId}.clientSecret`);
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        `${preset.label} sign-in is not configured. Set the client id and secret in godmode.`,
      );
    }

    // Per-provider extras (gitlab instance URL, azure tenant, apple keys…)
    const extra: Record<string, string> = {};
    for (const key of preset.extraKeys ?? []) {
      extra[key] = await this.settings.get<string>(`auth.oauth.${providerId}.${key}`);
    }

    let authorizeUrl = preset.authorizeUrl;
    let tokenUrl = preset.tokenUrl;
    let userinfoUrl = preset.userinfoUrl;
    if (providerId === 'gitlab') {
      const instance = (extra.instanceUrl || 'https://gitlab.com').replace(/\/+$/, '');
      authorizeUrl = `${instance}/oauth/authorize`;
      tokenUrl = `${instance}/oauth/token`;
      userinfoUrl = `${instance}/api/v4/user`;
    }
    if (providerId === 'azure') {
      const tenant = extra.tenant || 'common';
      authorizeUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
      tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    }
    if (providerId === 'keycloak') {
      const issuer = (extra.issuer || '').replace(/\/+$/, '');
      if (!issuer) throw new UnauthorizedException('Keycloak issuer URL is not set in godmode.');
      authorizeUrl = `${issuer}/protocol/openid-connect/auth`;
      tokenUrl = `${issuer}/protocol/openid-connect/token`;
      userinfoUrl = `${issuer}/protocol/openid-connect/userinfo`;
    }
    if (providerId === 'apple') {
      if (!extra.teamId || !extra.keyId || !extra.privateKey) {
        throw new UnauthorizedException(
          'Apple sign-in needs the Team ID, Key ID, and private key in godmode.',
        );
      }
    }

    return { ...preset, clientId, clientSecret, extra, authorizeUrl, tokenUrl, userinfoUrl };
  }
}

const PROVIDERS: Record<string, OAuthFlowConfig & { extraKeys?: string[] }> = {
  google: {
    id: 'google',
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: 'openid email profile',
    tokenAuth: 'body',
    mapProfile: (p) => ({
      providerId: String(p.sub ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name: typeof p.name === 'string' ? p.name : undefined,
      picture: typeof p.picture === 'string' ? p.picture : undefined,
    }),
  },
  github: {
    id: 'github',
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userinfoUrl: 'https://api.github.com/user',
    scopes: 'read:user user:email',
    tokenAuth: 'body',
    tokenAcceptJson: true,
    userinfoExtraHeaders: { 'user-agent': 'atlas' },
    mapProfile: (p) => ({
      providerId: String(p.id ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name: typeof p.name === 'string' ? p.name : typeof p.login === 'string' ? p.login : undefined,
      picture: typeof p.avatar_url === 'string' ? p.avatar_url : undefined,
      bio: typeof p.bio === 'string' ? p.bio : undefined,
    }),
  },
  gitlab: {
    id: 'gitlab',
    label: 'GitLab',
    authorizeUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    userinfoUrl: 'https://gitlab.com/api/v4/user',
    scopes: 'read_user',
    tokenAuth: 'body',
    extraKeys: ['instanceUrl'],
    mapProfile: (p) => ({
      providerId: String(p.id ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name:
        typeof p.name === 'string'
          ? p.name
          : typeof p.username === 'string'
            ? p.username
            : undefined,
      picture: typeof p.avatar_url === 'string' ? p.avatar_url : undefined,
    }),
  },
  apple: {
    id: 'apple',
    label: 'Apple',
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: 'name email',
    tokenAuth: 'apple-jwt',
    authorizeExtra: { response_mode: 'form_post' },
    profileFromIdToken: true,
    extraKeys: ['teamId', 'keyId', 'privateKey'],
    mapProfile: (p) => ({
      providerId: String(p.sub ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
    }),
  },
  x: {
    id: 'x',
    label: 'X',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userinfoUrl: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
    scopes: 'users.read',
    tokenAuth: 'basic',
    requiresPkce: true,
    mapProfile: (p) => {
      const data = (p.data ?? {}) as Record<string, unknown>;
      return {
        providerId: String(p.sub ?? data.id ?? ''),
        email: undefined, // X does not expose email to users.read
        name: typeof data.name === 'string' ? data.name : undefined,
        picture: typeof data.profile_image_url === 'string' ? data.profile_image_url : undefined,
      };
    },
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    userinfoUrl: 'https://graph.facebook.com/me?fields=id,email,name,picture',
    scopes: 'email public_profile',
    tokenAuth: 'body',
    tokenMethod: 'GET',
    mapProfile: (p) => ({
      providerId: String(p.id ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name: typeof p.name === 'string' ? p.name : undefined,
      picture:
        p.picture && typeof p.picture === 'object'
          ? String(
              ((p.picture as Record<string, unknown>).data as Record<string, unknown>)?.url ?? '',
            )
          : undefined,
    }),
  },
  discord: {
    id: 'discord',
    label: 'Discord',
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userinfoUrl: 'https://discord.com/api/users/@me',
    scopes: 'identify email',
    tokenAuth: 'body',
    mapProfile: (p) => ({
      providerId: String(p.id ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name:
        typeof p.global_name === 'string' && p.global_name
          ? p.global_name
          : String(p.username ?? ''),
      picture:
        typeof p.avatar === 'string'
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
          : undefined,
    }),
  },
  azure: {
    id: 'azure',
    label: 'Microsoft',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: 'openid email profile User.Read',
    tokenAuth: 'body',
    extraKeys: ['tenant'],
    mapProfile: (p) => ({
      providerId: String(p.id ?? p.sub ?? ''),
      email:
        typeof p.mail === 'string'
          ? p.mail
          : typeof p.userPrincipalName === 'string'
            ? p.userPrincipalName
            : undefined,
      name: typeof p.displayName === 'string' ? p.displayName : undefined,
    }),
  },
  keycloak: {
    id: 'keycloak',
    label: 'Keycloak',
    authorizeUrl: '',
    tokenUrl: '',
    userinfoUrl: '',
    scopes: 'openid email profile',
    tokenAuth: 'body',
    extraKeys: ['issuer'],
    mapProfile: (p) => ({
      providerId: String(p.sub ?? ''),
      email: typeof p.email === 'string' ? p.email : undefined,
      name:
        typeof p.name === 'string'
          ? p.name
          : [p.given_name, p.family_name].filter(Boolean).join(' ').trim() ||
            String(p.preferred_username ?? ''),
      picture: typeof p.picture === 'string' ? p.picture : undefined,
    }),
  },
};

export { PROVIDERS };
