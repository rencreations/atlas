import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from '@/modules/settings/settings.service';

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
  constructor(private readonly settings: SettingsService) {}

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
      passphraseEnabled,
      oidcEnabled,
      oidcLabel,
      samlEnabled,
      samlLabel,
      pmoEnabled,
      voiceEnabled,
      tenorKey,
      giphyKey,
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
      this.settings.get<boolean>('auth.passphrase.enabled'),
      this.settings.get<boolean>('sso.oidc.enabled'),
      this.settings.get<string>('sso.oidc.buttonLabel'),
      this.settings.get<boolean>('sso.saml.enabled'),
      this.settings.get<string>('sso.saml.buttonLabel'),
      this.settings.get<boolean>('modules.pmo.enabled'),
      this.settings.get<boolean>('modules.voice.enabled'),
      this.settings.get<string>('integrations.gifs.tenorApiKey'),
      this.settings.get<string>('integrations.gifs.giphyApiKey'),
      this.settings.get<string>('integrations.push.vapidPublicKey'),
    ]);

    const oauth = await Promise.all(
      Object.entries(OAUTH_LABELS).map(async ([id, label]) => ({
        id,
        label,
        enabled: await this.settings.get<boolean>(`auth.oauth.${id}.enabled`),
      })),
    );

    return {
      configured,
      site: {
        name: siteName,
        description: siteDescription,
      },
      registration: {
        enabled: registrationEnabled,
        inviteRequired,
        defaultRole,
      },
      authMethods: {
        password: { enabled: passwordEnabled, label: 'Email & password' },
        magicLink: { enabled: magicLinkEnabled, label: 'Magic link' },
        phone: { enabled: phoneEnabled, otpEnabled: phoneOtpEnabled, label: 'Phone' },
        passphrase: { enabled: passphraseEnabled, label: 'Passphrase' },
      },
      oauthProviders: oauth.filter((p) => p.enabled).map((p) => ({ id: p.id, label: p.label })),
      sso: {
        oidc: { enabled: oidcEnabled, label: oidcLabel },
        saml: { enabled: samlEnabled, label: samlLabel },
      },
      modules: {
        pmo: pmoEnabled,
        voice: voiceEnabled,
      },
      features: {
        gifs: !!(tenorKey || giphyKey),
        push: !!vapidPublicKey,
      },
    };
  }
}
