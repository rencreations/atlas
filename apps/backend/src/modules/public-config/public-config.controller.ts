import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from '@/modules/settings/settings.service';
import { SsoConnectionsService } from '@/modules/auth/sso-connections.service';
import { PassphraseCredentialsService } from '@/modules/auth/passphrase-credentials.service';
import { THEME_OPTIONS } from '@/modules/settings/theme-ids';

const OAUTH_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  apple: 'Apple',
  x: 'X',
  facebook: 'Facebook',
  discord: 'Discord',
  azure: 'Microsoft',
  keycloak: 'Keycloak',
};

/**
 * Public, unauthenticated instance metadata. The frontend reads this to
 * render the right login surface and to decide whether the instance still
 * needs its first godmode onboarding.
 */
@ApiTags('public-config')
@Controller('public-config')
export class PublicConfigController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
    private readonly ssoConnections: SsoConnectionsService,
    private readonly passphraseCredentials: PassphraseCredentialsService,
  ) {}

  @Public()
  @Get('legal/:page')
  async legal(@Param('page') page: string) {
    const key =
      page === 'terms' ? 'legal.termsText' : page === 'privacy' ? 'legal.privacyText' : null;
    if (!key) throw new NotFoundException('Unknown legal page.');
    const text = await this.settings.get<string>(key);
    if (!text)
      throw new NotFoundException('This legal page has not been published on this instance.');
    return { page, text };
  }

  @Public()
  @Get()
  async get() {
    const [
      configured,
      siteName,
      siteDescription,
      registrationEnabled,
      inviteRequired,
      defaultRole,
      passwordEnabled,
      magicLinkEnabled,
      phoneEnabled,
      phoneOtpEnabled,
      oidcEnabled,
      oidcLabel,
      samlEnabled,
      samlLabel,
      pmoEnabled,
      voiceEnabled,
      gifsEnabled,
      klipyAppKey,
      pushEnabled,
      vapidPublicKey,
    ] = await Promise.all([
      this.settings.isConfigured(),
      this.settings.get<string>('site.name'),
      this.settings.get<string>('site.description'),
      this.settings.get<boolean>('registration.enabled'),
      this.settings.get<boolean>('registration.inviteRequired'),
      this.settings.get<string>('registration.defaultRole'),
      this.settings.get<boolean>('auth.emailPassword.enabled'),
      this.settings.get<boolean>('auth.magicLink.enabled'),
      this.settings.get<boolean>('auth.phone.enabled'),
      this.settings.get<boolean>('auth.phone.otpEnabled'),
      this.settings.get<boolean>('sso.oidc.enabled'),
      this.settings.get<string>('sso.oidc.buttonLabel'),
      this.settings.get<boolean>('sso.saml.enabled'),
      this.settings.get<string>('sso.saml.buttonLabel'),
      this.settings.get<boolean>('modules.pmo.enabled'),
      this.settings.get<boolean>('modules.voice.enabled'),
      this.settings.get<boolean>('integrations.gifs.enabled'),
      this.settings.get<string>('integrations.gifs.klipyAppKey'),
      this.settings.get<boolean>('integrations.push.enabled'),
      this.settings.get<string>('integrations.push.vapidPublicKey'),
    ]);

    const oauth = await Promise.all(
      Object.entries(OAUTH_LABELS).map(async ([id, label]) => ({
        id,
        label,
        enabled: await this.settings.get<boolean>(`auth.oauth.${id}.enabled`),
      })),
    );

    const requireEmailVerification = await this.settings.get<boolean>(
      'registration.requireEmailVerification',
    );

    // Callback URLs operators must register at each provider's console.
    const backendBase = this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000';
    const oauthCallbacks = Object.fromEntries(
      oauth.map((p) => [
        p.id,
        `${backendBase.replace(/\/+$/, '')}/api/v1/auth/oauth/${p.id}/callback`,
      ]),
    );

    return {
      configured,
      site: {
        name: siteName,
        description: siteDescription,
      },
      appearance: {
        defaultTheme: await this.settings.get<string>('appearance.defaultTheme'),
        defaultThemeMode: await this.settings.get<string>('appearance.defaultThemeMode'),
        allowUserThemes: await this.settings.get<boolean>('appearance.allowUserThemes'),
      },
      /** Theme catalog (ids + labels); the frontend owns the palettes. */
      themes: THEME_OPTIONS,
      registration: {
        enabled: registrationEnabled,
        inviteRequired,
        defaultRole,
        requireEmailVerification,
      },
      authMethods: {
        password: { enabled: passwordEnabled, label: 'Email & password' },
        magicLink: { enabled: magicLinkEnabled, label: 'Magic link' },
        phone: { enabled: phoneEnabled, otpEnabled: phoneOtpEnabled, label: 'Phone' },
        // No single flat toggle anymore: an instance can offer several
        // named passphrases at once, so "enabled" here just means at
        // least one of them currently is.
        passphrase: { enabled: await this.passphraseCredentials.hasAny(), label: 'Passphrase' },
      },
      oauthProviders: oauth.filter((p) => p.enabled).map((p) => ({ id: p.id, label: p.label })),
      oauthCallbacks,
      sso: {
        oidc: { enabled: oidcEnabled, label: oidcLabel },
        saml: { enabled: samlEnabled, label: samlLabel },
        // Tenant directories: every enabled connection gets its own
        // button on the login page.
        connections: (await this.ssoConnections.enabled()).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          domains: c.domains,
        })),
      },
      modules: {
        pmo: pmoEnabled,
        voice: voiceEnabled,
      },
      features: {
        gifs: !!(gifsEnabled && klipyAppKey),
        push: !!(pushEnabled && vapidPublicKey),
      },
      gifs: {
        available: !!(gifsEnabled && klipyAppKey),
        // The Klipy app key is designed to run client-side (it is what
        // gif-picker-react's Klipy provider calls the API with directly
        // from the browser), so it is not treated as a secret.
        klipyAppKey: gifsEnabled ? klipyAppKey : '',
      },
      legal: {
        requireConsent: await this.settings.get<boolean>('legal.requireConsent'),
        terms: !!(await this.settings.get<string>('legal.termsText')),
        privacy: !!(await this.settings.get<string>('legal.privacyText')),
      },
    };
  }
}
