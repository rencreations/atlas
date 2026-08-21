import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAML } from '@node-saml/node-saml';
import { SettingsService } from '@/modules/settings/settings.service';
import { ExternalProfile, IdentityService, SessionUser } from './identity.service';

/**
 * SAML 2.0 service provider (HTTP-POST binding) for directory SSO
 * against Okta, Entra ID, OneLogin, etc. Config lives in godmode
 * (sso.saml.*). The ACS endpoint consumes the IdP's POSTed assertion
 * and validates it against the configured IdP certificate.
 */
@Injectable()
export class SamlService {
  private readonly logger = new Logger(SamlService.name);
  private sp: SAML | null = null;
  private spConfigKey = '';

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly identity: IdentityService,
  ) {}

  async isEnabled(): Promise<boolean> {
    return this.settings.get<boolean>('sso.saml.enabled');
  }

  private backendBaseUrl(): string {
    return this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000';
  }

  acsUrl(): string {
    return `${this.backendBaseUrl().replace(/\/+$/, '')}/api/v1/auth/saml/acs`;
  }

  private async saml(): Promise<SAML> {
    const [entryPoint, issuer, cert] = await Promise.all([
      this.settings.get<string>('sso.saml.entryPoint'),
      this.settings.get<string>('sso.saml.issuer'),
      this.settings.get<string>('sso.saml.cert'),
    ]);
    if (!entryPoint || !cert) {
      throw new UnauthorizedException(
        'SAML SSO is not configured. Set the entry point and IdP certificate in godmode.',
      );
    }
    const key = `${entryPoint}|${issuer}|${cert.slice(0, 32)}`;
    if (this.sp && this.spConfigKey === key) return this.sp;

    this.sp = new SAML({
      callbackUrl: this.acsUrl(),
      entryPoint,
      issuer: issuer || this.backendBaseUrl(),
      idpCert: cert,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      disableRequestedAuthnContext: true,
    });
    this.spConfigKey = key;
    return this.sp;
  }

  /** Metadata for the IdP: ACS URL + SP entity id. */
  async metadata(): Promise<{ entityId: string; acsUrl: string; sloUrl: string }> {
    const issuer = await this.settings.get<string>('sso.saml.issuer');
    return {
      entityId: issuer || this.backendBaseUrl(),
      acsUrl: this.acsUrl(),
      sloUrl: '',
    };
  }

  async start(): Promise<string> {
    const sp = await this.saml();
    try {
      return await sp.getAuthorizeUrlAsync('', undefined, {});
    } catch (err) {
      this.logger.warn(`SAML authorize URL failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Could not build the SAML sign-in request.');
    }
  }

  async handleAcs(body: Record<string, unknown>): Promise<{ user: SessionUser; returnTo: null }> {
    const sp = await this.saml();
    const rawResponse = body?.SAMLResponse ?? body?.SAMLart;
    if (!rawResponse || typeof rawResponse !== 'string') {
      throw new UnauthorizedException('Missing SAML response.');
    }
    try {
      const parsed = await sp.validatePostResponseAsync({
        SAMLResponse: rawResponse,
        ...(typeof body.RelayState === 'string' ? { RelayState: body.RelayState } : {}),
      });
      const p = parsed.profile as Record<string, unknown>;
      const nameId = typeof p.nameID === 'string' ? p.nameID : String(p.nameID ?? '');
      const given = typeof p.givenName === 'string' ? p.givenName : '';
      const surname = typeof p.surname === 'string' ? p.surname : '';
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      const first = (v: unknown): string | undefined => {
        if (typeof v === 'string') return v;
        if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
        return undefined;
      };

      const profile: ExternalProfile = {
        providerId: nameId,
        email:
          first(p.email) ??
          first(attrs.email) ??
          first(attrs.mail) ??
          first(attrs.userprincipalname),
        name:
          given || surname
            ? `${given} ${surname}`.trim()
            : (first(p.name) ?? first(attrs.displayname) ?? undefined),
        picture: first(attrs.picture) ?? first(attrs.photo) ?? undefined,
      };
      if (!profile.providerId) {
        throw new Error('SAML assertion has no nameID.');
      }
      const user = await this.identity.upsertFromExternal('saml', profile);
      return { user, returnTo: null };
    } catch (err) {
      this.logger.warn(`SAML ACS validation failed: ${(err as Error).message}`);
      throw new UnauthorizedException('SAML assertion validation failed.');
    }
  }
}
