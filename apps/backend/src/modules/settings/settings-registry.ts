/**
 * The code-defined registry of every godmode-managed setting.
 *
 * Each entry declares its type, default, metadata for the godmode UI, and
 * whether the value is a secret (encrypted at rest + masked in responses).
 * `envFallback` keeps legacy `.env` variables working as layer-0 defaults
 * so existing deployments upgrade without losing configuration.
 *
 * Adding a new setting = add one entry here + consume it via
 * `SettingsService.get('...')`. No migration needed.
 */

import { THEME_OPTIONS } from './theme-ids';

export type SettingType = 'boolean' | 'string' | 'number' | 'json' | 'enum';

export interface SettingOption {
  label: string;
  value: string;
}

export interface SettingDef {
  key: string;
  type: SettingType;
  label: string;
  description?: string;
  /** Group slug used by the godmode UI sidebar. */
  group: SettingGroup;
  defaultValue: unknown;
  secret?: boolean;
  options?: SettingOption[];
  envFallback?: string;
  /** Exposed in GET /public-config (never secrets). */
  public?: boolean;
  /** Hidden behind the "Advanced" toggle in the UI. */
  advanced?: boolean;
}

export type SettingGroup =
  | 'system'
  | 'site'
  | 'appearance'
  | 'registration'
  | 'auth'
  | 'sessions'
  | 'email'
  | 'sms'
  | 'oauth'
  | 'sso'
  | 'storage'
  | 'integrations'
  | 'modules'
  | 'legal'
  | 'godmode';

export const SETTING_GROUPS: { slug: SettingGroup; label: string; description: string }[] = [
  { slug: 'system', label: 'System', description: 'Instance identity and first-run status.' },
  { slug: 'site', label: 'Site', description: 'Public site identity and branding.' },
  {
    slug: 'appearance',
    label: 'Appearance',
    description: 'The default theme users see, and whether they may pick their own.',
  },
  {
    slug: 'registration',
    label: 'Registration',
    description: 'Who can create an account, and what they get.',
  },
  { slug: 'auth', label: 'Authentication', description: 'Local sign-in methods and passphrase.' },
  { slug: 'sessions', label: 'Sessions', description: 'Session lifetime and security policy.' },
  {
    slug: 'email',
    label: 'Email',
    description:
      'SMTP, Resend, AWS SES, or the console adapter. Powers magic links, OTP and notifications.',
  },
  {
    slug: 'sms',
    label: 'SMS / OTP',
    description: 'Twilio, Vonage, Infobip, Sinch, MessageBird, or the console adapter.',
  },
  {
    slug: 'oauth',
    label: 'OAuth providers',
    description: 'Social and enterprise OAuth2 sign-in providers.',
  },
  {
    slug: 'sso',
    label: 'SSO (OIDC / SAML)',
    description: 'Connect a directory like Okta or Entra ID.',
  },
  {
    slug: 'storage',
    label: 'Storage',
    description: 'S3 or S3-compatible object storage for uploads and media.',
  },
  {
    slug: 'integrations',
    label: 'Integrations',
    description: 'Webhooks, GIFs, and push notifications.',
  },
  {
    slug: 'modules',
    label: 'Modules',
    description: 'Feature gates for the PMO and voice modules.',
  },
  {
    slug: 'legal',
    label: 'Legal',
    description: 'Terms and privacy text rendered on the public pages.',
  },
  {
    slug: 'godmode',
    label: 'Godmode security',
    description: 'Second factors for the control plane itself.',
  },
];

const bool = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  defaultValue: boolean,
  extra?: Partial<SettingDef>,
): SettingDef => ({ key, type: 'boolean', group, label, description, defaultValue, ...extra });

const str = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  defaultValue = '',
  extra?: Partial<SettingDef>,
): SettingDef => ({ key, type: 'string', group, label, description, defaultValue, ...extra });

const secret = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  defaultValue = '',
): SettingDef => ({ key, type: 'string', group, label, description, defaultValue, secret: true });

const num = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  defaultValue = 0,
  extra?: Partial<SettingDef>,
): SettingDef => ({ key, type: 'number', group, label, description, defaultValue, ...extra });

const enu = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  defaultValue: string,
  options: SettingOption[],
  extra?: Partial<SettingDef>,
): SettingDef => ({
  key,
  type: 'enum',
  group,
  label,
  description,
  defaultValue,
  options,
  ...extra,
});

export const SETTINGS: Record<string, SettingDef> = {
  // ─── System ───────────────────────────────────────────────────────
  'system.configured': bool(
    'system.configured',
    'system',
    'Instance configured',
    'Flipped to true when the first godmode onboarding completes.',
    false,
    { advanced: true },
  ),
  'system.instanceUrl': str(
    'system.instanceUrl',
    'system',
    'Public instance URL',
    'Where users reach Atlas. Used to build magic links, callbacks, and SAML ACS URLs.',
    '',
    { envFallback: 'APP_BASE_URL', advanced: true },
  ),

  // ─── Site ─────────────────────────────────────────────────────────
  'site.name': str(
    'site.name',
    'site',
    'Site name',
    'Shown in the header, emails, and browser titles.',
    'Atlas',
    {
      envFallback: 'SITE_NAME',
    },
  ),
  'site.description': str(
    'site.description',
    'site',
    'Tagline',
    'One-liner shown on the login page.',
    'Your organization workspace for projects, chat, PMO, and voice in one place.',
  ),

  // ─── Appearance ───────────────────────────────────────────────────
  'appearance.defaultTheme': enu(
    'appearance.defaultTheme',
    'appearance',
    'Default theme',
    'The theme applied for visitors and for users who have not picked one.',
    'atlas',
    THEME_OPTIONS,
    { public: true },
  ),
  'appearance.defaultThemeMode': enu(
    'appearance.defaultThemeMode',
    'appearance',
    'Default mode',
    'Light, dark, or follow the visitor’s device.',
    'system',
    [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
      { label: 'System', value: 'system' },
    ],
    { public: true },
  ),
  'appearance.allowUserThemes': bool(
    'appearance.allowUserThemes',
    'appearance',
    'Let users pick their own theme',
    'When off, everyone sees the default theme and the settings gallery is hidden.',
    true,
    { public: true },
  ),

  // ─── Registration ─────────────────────────────────────────────────
  'registration.enabled': bool(
    'registration.enabled',
    'registration',
    'Allow self-registration',
    'When off, only admins (and godmode) can create accounts.',
    false,
    { public: true },
  ),
  'registration.inviteRequired': bool(
    'registration.inviteRequired',
    'registration',
    'Require an invite to register',
    'When on, the registration form asks for an invite code issued by an admin.',
    true,
  ),
  'registration.requireEmailVerification': bool(
    'registration.requireEmailVerification',
    'registration',
    'Require email verification',
    'New accounts must click the verification link before signing in.',
    false,
  ),
  'registration.defaultRole': enu(
    'registration.defaultRole',
    'registration',
    'Default role for new users',
    'Role granted to every newly registered account.',
    'member',
    [
      { label: 'Member', value: 'member' },
      { label: 'Developer', value: 'developer' },
      { label: 'Visitor', value: 'visitor' },
    ],
    { public: true },
  ),
  'registration.autoVerifyNewUsers': bool(
    'registration.autoVerifyNewUsers',
    'registration',
    'Auto-verify accounts created by admins',
    'Admin-created accounts skip the email verification step.',
    true,
  ),

  // ─── Local auth methods ───────────────────────────────────────────
  'auth.emailPassword.enabled': bool(
    'auth.emailPassword.enabled',
    'auth',
    'Email + password',
    'Allow sign-in with an email address and password.',
    true,
    { public: true },
  ),
  'auth.magicLink.enabled': bool(
    'auth.magicLink.enabled',
    'auth',
    'Magic link',
    'Allow passwordless sign-in via an emailed one-time link.',
    false,
    { public: true },
  ),
  'auth.phone.enabled': bool(
    'auth.phone.enabled',
    'auth',
    'Phone + password / OTP',
    'Allow sign-in with a phone number. Password and OTP are alternatives.',
    false,
    { public: true },
  ),
  'auth.phone.otpEnabled': bool(
    'auth.phone.otpEnabled',
    'auth',
    'Phone OTP login',
    'Allow one-time-code sign-in for accounts with a verified phone.',
    true,
    { public: true },
  ),
  'auth.passphrase.enabled': bool(
    'auth.passphrase.enabled',
    'auth',
    'Instance passphrase',
    'Let anyone sign in with a single shared passphrase (e.g. for a team or kiosk).',
    false,
    { public: true },
  ),
  'auth.passphrase.value': secret(
    'auth.passphrase.value',
    'auth',
    'Passphrase',
    'The shared sign-in phrase. Stored encrypted.',
  ),
  'auth.passphrase.role': enu(
    'auth.passphrase.role',
    'auth',
    'Role for passphrase sign-ins',
    'Role granted to accounts that sign in with the passphrase.',
    'member',
    [
      { label: 'Member', value: 'member' },
      { label: 'Developer', value: 'developer' },
      { label: 'Visitor', value: 'visitor' },
      { label: 'Admin', value: 'admin' },
    ],
  ),

  // ─── Sessions ─────────────────────────────────────────────────────
  'auth.sessionDurationMinutes': num(
    'auth.sessionDurationMinutes',
    'sessions',
    'Session lifetime (minutes)',
    'How long an authenticated session stays valid.',
    480,
  ),
  'auth.forcePasswordChangeOnProvision': bool(
    'auth.forcePasswordChangeOnProvision',
    'sessions',
    'Force password change for provisioned accounts',
    'Users created by admins must change their password on first login.',
    true,
  ),
  'auth.passwordMinLength': num(
    'auth.passwordMinLength',
    'sessions',
    'Minimum password length',
    'Enforced on registration, reset, and password change.',
    8,
    { advanced: true },
  ),

  // ─── Email provider ───────────────────────────────────────────────
  'email.provider': enu(
    'email.provider',
    'email',
    'Email provider',
    'How Atlas sends mail: magic links, verification, notifications.',
    'console',
    [
      { label: 'Console (development only)', value: 'console' },
      { label: 'SMTP', value: 'smtp' },
      { label: 'Resend', value: 'resend' },
      { label: 'AWS SES', value: 'ses' },
    ],
  ),
  'email.smtp.host': str('email.smtp.host', 'email', 'SMTP host', 'e.g. smtp.postmarkapp.com', '', {
    envFallback: 'MAIL_HOST',
  }),
  'email.smtp.port': num(
    'email.smtp.port',
    'email',
    'SMTP port',
    '587 (STARTTLS) or 465 (SSL).',
    587,
    {
      envFallback: 'MAIL_PORT',
    },
  ),
  'email.smtp.user': str('email.smtp.user', 'email', 'SMTP username', '', '', {
    envFallback: 'MAIL_USER',
  }),
  'email.smtp.password': secret('email.smtp.password', 'email', 'SMTP password', '', ''),
  'email.smtp.secure': bool(
    'email.smtp.secure',
    'email',
    'SMTP SSL',
    'Use implicit TLS (port 465). Off = STARTTLS.',
    false,
  ),
  'email.fromAddress': str(
    'email.fromAddress',
    'email',
    'From address',
    'Sender address for all outbound mail.',
    'no-reply@atlas.local',
    { envFallback: 'MAIL_FROM_ADDRESS' },
  ),
  'email.fromName': str('email.fromName', 'email', 'From name', 'Sender display name.', 'Atlas', {
    envFallback: 'MAIL_FROM_NAME',
  }),
  'email.resend.apiKey': secret(
    'email.resend.apiKey',
    'email',
    'Resend API key',
    'From resend.com → API Keys.',
  ),
  'email.ses.region': str(
    'email.ses.region',
    'email',
    'SES region',
    'e.g. us-east-1. Find it in the AWS console header.',
    'us-east-1',
    { envFallback: 'AWS_REGION' },
  ),
  'email.ses.accessKeyId': str(
    'email.ses.accessKeyId',
    'email',
    'SES access key id',
    'An IAM user with ses:SendEmail. From AWS → IAM → Users → Security credentials.',
    '',
  ),
  'email.ses.secretAccessKey': secret(
    'email.ses.secretAccessKey',
    'email',
    'SES secret access key',
    '',
    '',
  ),

  // ─── SMS providers ────────────────────────────────────────────────
  'sms.provider': enu(
    'sms.provider',
    'sms',
    'SMS provider',
    'Who delivers the OTP codes. Console prints codes to the server log (development only).',
    'console',
    [
      { label: 'Console (development only)', value: 'console' },
      { label: 'Twilio', value: 'twilio' },
      { label: 'Vonage', value: 'vonage' },
      { label: 'Infobip', value: 'infobip' },
      { label: 'Sinch', value: 'sinch' },
      { label: 'MessageBird', value: 'messagebird' },
    ],
  ),
  'sms.twilio.accountSid': secret(
    'sms.twilio.accountSid',
    'sms',
    'Twilio Account SID',
    'From console.twilio.com → Account → API keys & tokens.',
  ),
  'sms.twilio.authToken': secret(
    'sms.twilio.authToken',
    'sms',
    'Twilio Auth Token',
    'Same page as the Account SID.',
  ),
  'sms.twilio.from': str(
    'sms.twilio.from',
    'sms',
    'Twilio from number',
    'Your Twilio phone number in E.164, e.g. +15551234567.',
  ),
  'sms.vonage.apiKey': secret(
    'sms.vonage.apiKey',
    'sms',
    'Vonage API key',
    'From dashboard.nexmo.com → Settings.',
  ),
  'sms.vonage.apiSecret': secret(
    'sms.vonage.apiSecret',
    'sms',
    'Vonage API secret',
    'Same page as the API key.',
  ),
  'sms.vonage.from': str('sms.vonage.from', 'sms', 'Vonage from', 'Sender name or E.164 number.'),
  'sms.infobip.apiKey': secret(
    'sms.infobip.apiKey',
    'sms',
    'Infobip API key',
    'From portal.infobip.com → Developers → API Keys.',
  ),
  'sms.infobip.baseUrl': str(
    'sms.infobip.baseUrl',
    'sms',
    'Infobip base URL',
    'Your API base URL from the Infobip portal, e.g. https://xxxx.api.infobip.com.',
    'https://api.infobip.com',
  ),
  'sms.infobip.from': str(
    'sms.infobip.from',
    'sms',
    'Infobip from',
    'Sender name or E.164 number.',
  ),
  'sms.sinch.apiToken': secret(
    'sms.sinch.apiToken',
    'sms',
    'Sinch API token',
    'From dashboard.sinch.com → Access keys.',
  ),
  'sms.sinch.projectId': str(
    'sms.sinch.projectId',
    'sms',
    'Sinch project id',
    'From the Sinch dashboard project settings.',
  ),
  'sms.sinch.servicePlanId': str(
    'sms.sinch.servicePlanId',
    'sms',
    'Sinch service plan id',
    'Needed if you use the legacy SMS API plan.',
  ),
  'sms.sinch.from': str('sms.sinch.from', 'sms', 'Sinch from', 'Sender name or E.164 number.'),
  'sms.messagebird.apiKey': secret(
    'sms.messagebird.apiKey',
    'sms',
    'MessageBird API key',
    'From dashboard.messagebird.com → Developers → API access.',
  ),
  'sms.messagebird.from': str(
    'sms.messagebird.from',
    'sms',
    'MessageBird from',
    'Sender name or E.164 number.',
  ),
  'sms.otpLength': num('sms.otpLength', 'sms', 'OTP length', 'Digits per one-time code.', 6, {
    advanced: true,
  }),
  'sms.otpTtlSeconds': num(
    'sms.otpTtlSeconds',
    'sms',
    'OTP lifetime (seconds)',
    'Codes expire after this.',
    300,
    {
      advanced: true,
    },
  ),
  'sms.otpMaxAttempts': num(
    'sms.otpMaxAttempts',
    'sms',
    'OTP max attempts',
    'Failed verifications per code before it is invalidated.',
    5,
    {
      advanced: true,
    },
  ),

  // ─── OAuth providers ──────────────────────────────────────────────
  ...oauthDefs(),

  // ─── SSO (OIDC / SAML) ────────────────────────────────────────────
  'sso.oidc.enabled': bool(
    'sso.oidc.enabled',
    'sso',
    'OIDC SSO',
    'Generic OpenID Connect login against any discovery-compatible IdP.',
    false,
    { public: true },
  ),
  'sso.oidc.issuer': str(
    'sso.oidc.issuer',
    'sso',
    'OIDC issuer URL',
    'Your IdP discovery URL, e.g. https://your-org.okta.com (Okta appends /oauth2/default).',
  ),
  'sso.oidc.clientId': str(
    'sso.oidc.clientId',
    'sso',
    'OIDC client id',
    'From your IdP application settings.',
  ),
  'sso.oidc.clientSecret': secret('sso.oidc.clientSecret', 'sso', 'OIDC client secret', ''),
  'sso.oidc.buttonLabel': str(
    'sso.oidc.buttonLabel',
    'sso',
    'OIDC button label',
    'Shown on the login page, e.g. "Sign in with Okta".',
    'Single sign-on',
    { public: true },
  ),
  'sso.saml.enabled': bool(
    'sso.saml.enabled',
    'sso',
    'SAML SSO',
    'SAML 2.0 service-provider login against Okta, Entra ID, OneLogin, etc.',
    false,
    { public: true },
  ),
  'sso.saml.entryPoint': str(
    'sso.saml.entryPoint',
    'sso',
    'SAML entry point',
    'The IdP SSO URL (login endpoint).',
  ),
  'sso.saml.issuer': str(
    'sso.saml.issuer',
    'sso',
    'SAML issuer (SP entity id)',
    'Usually this instance URL. Register the same value in your IdP.',
  ),
  'sso.saml.cert': secret(
    'sso.saml.cert',
    'sso',
    'SAML IdP certificate',
    'X.509 cert (PEM) used to validate IdP assertions.',
  ),
  'sso.saml.buttonLabel': str(
    'sso.saml.buttonLabel',
    'sso',
    'SAML button label',
    'Shown on the login page, e.g. "Company SSO".',
    'Company SSO',
    { public: true },
  ),

  // ─── Storage ──────────────────────────────────────────────────────
  'storage.provider': enu(
    'storage.provider',
    'storage',
    'Storage provider',
    'Where uploads (media, avatars, files) are stored.',
    's3',
    [
      { label: 'S3-compatible (AWS or MinIO/R2/…)', value: 's3' },
      { label: 'Disabled', value: 'disabled' },
    ],
  ),
  'storage.s3.region': str(
    'storage.s3.region',
    'storage',
    'S3 region',
    'e.g. ap-southeast-1, us-east-1, auto for R2.',
    'ap-southeast-1',
    {
      envFallback: 'AWS_REGION',
    },
  ),
  'storage.s3.bucket': str(
    'storage.s3.bucket',
    'storage',
    'S3 bucket',
    'Bucket name for uploads.',
    '',
    {
      envFallback: 'AWS_S3_BUCKET',
    },
  ),
  'storage.s3.endpoint': str(
    'storage.s3.endpoint',
    'storage',
    'S3 endpoint (optional)',
    'Leave empty for AWS. Set to your MinIO / R2 endpoint URL for S3-compatible stores.',
  ),
  'storage.s3.accessKeyId': str('storage.s3.accessKeyId', 'storage', 'S3 access key id', '', '', {
    envFallback: 'AWS_ACCESS_KEY_ID',
  }),
  'storage.s3.secretAccessKey': secret(
    'storage.s3.secretAccessKey',
    'storage',
    'S3 secret access key',
    '',
  ),
  'storage.s3.publicBaseUrl': str(
    'storage.s3.publicBaseUrl',
    'storage',
    'S3 public base URL',
    'CDN or bucket public URL used to serve stored objects, e.g. https://cdn.example.com.',
    '',
    { envFallback: 'AWS_S3_PUBLIC_BASE_URL' },
  ),

  // ─── Integrations ─────────────────────────────────────────────────
  'integrations.n8n.baseUrl': str(
    'integrations.n8n.baseUrl',
    'integrations',
    'n8n base URL',
    'Webhook receiver for workflow automations.',
    '',
    { envFallback: 'N8N_BASE_URL' },
  ),
  'integrations.n8n.webhookPath': str(
    'integrations.n8n.webhookPath',
    'integrations',
    'n8n webhook path',
    '',
    '/webhook/atlas',
    { envFallback: 'N8N_WEBHOOK_PATH' },
  ),
  'integrations.n8n.secret': secret(
    'integrations.n8n.secret',
    'integrations',
    'n8n webhook secret',
    'HMAC signing secret shared with n8n.',
  ),
  'integrations.gifs.tenorApiKey': secret(
    'integrations.gifs.tenorApiKey',
    'integrations',
    'Tenor API key',
    'From developers.google.com/tenor.',
  ),
  'integrations.gifs.giphyApiKey': secret(
    'integrations.gifs.giphyApiKey',
    'integrations',
    'Giphy API key',
    'From developers.giphy.com.',
  ),
  'integrations.push.vapidPublicKey': str(
    'integrations.push.vapidPublicKey',
    'integrations',
    'VAPID public key',
    'Generate with: npx web-push generate-vapid-keys',
    '',
    { envFallback: 'VAPID_PUBLIC_KEY' },
  ),
  'integrations.push.vapidPrivateKey': secret(
    'integrations.push.vapidPrivateKey',
    'integrations',
    'VAPID private key',
    '',
  ),
  'integrations.push.vapidSubject': str(
    'integrations.push.vapidSubject',
    'integrations',
    'VAPID subject',
    'mailto: or https: contact identity.',
    'mailto:dev@atlas.local',
    { envFallback: 'VAPID_SUBJECT' },
  ),

  // ─── Modules ──────────────────────────────────────────────────────
  'modules.pmo.enabled': bool(
    'modules.pmo.enabled',
    'modules',
    'PMO module',
    'Project management: lists, kanban, Gantt, notes, whiteboards, files.',
    false,
    { envFallback: 'PMO_ENABLED', public: true },
  ),
  'modules.voice.enabled': bool(
    'modules.voice.enabled',
    'modules',
    'Voice module',
    'LiveKit voice/video rooms and screen share.',
    false,
    { envFallback: 'VOICE_ENABLED', public: true },
  ),

  // ─── Legal ────────────────────────────────────────────────────────
  'legal.termsText': str(
    'legal.termsText',
    'legal',
    'Terms of service',
    'Markdown. Rendered at /legal/terms. Empty = the page 404s.',
    '',
    { type: 'string' },
  ),
  'legal.privacyText': str(
    'legal.privacyText',
    'legal',
    'Privacy policy',
    'Markdown. Rendered at /legal/privacy. Empty = the page 404s.',
    '',
  ),
  'legal.requireConsent': bool(
    'legal.requireConsent',
    'registration',
    'Require consent on registration',
    'New users must accept the terms before their account activates.',
    false,
  ),

  // ─── Godmode security ─────────────────────────────────────────────
  'godmode.sessionTtlMinutes': num(
    'godmode.sessionTtlMinutes',
    'godmode',
    'Godmode session lifetime (minutes)',
    'How long an unlocked godmode session stays valid.',
    720,
  ),
  'godmode.totp.enabled': bool(
    'godmode.totp.enabled',
    'godmode',
    'Require TOTP for godmode',
    'After the passphrase, a 6-digit authenticator code is required.',
    false,
  ),
  'godmode.totp.secret': secret(
    'godmode.totp.secret',
    'godmode',
    'TOTP secret',
    'Base32 authenticator secret. Set via the 2FA setup flow.',
  ),
};

function oauthDefs(): Record<string, SettingDef> {
  const defs: Record<string, SettingDef> = {};
  const providers: {
    id: string;
    label: string;
    tutorial: string;
    extra?: { key: string; label: string; description: string; secret?: boolean }[];
  }[] = [
    {
      id: 'google',
      label: 'Google',
      tutorial:
        'Console → https://console.cloud.google.com/apis/credentials. Create an OAuth client (Web application), add the callback URL shown below, and copy the client id and secret.',
    },
    {
      id: 'github',
      label: 'GitHub',
      tutorial:
        'GitHub → Settings → Developer settings → OAuth Apps. Register a new app with the callback URL shown below, then copy the client id and secret.',
    },
    {
      id: 'gitlab',
      label: 'GitLab',
      tutorial:
        'GitLab → User Settings → Applications (or a group/instance application). Set the redirect URI to the callback URL shown below.',
      extra: [
        {
          key: 'instanceUrl',
          label: 'Instance URL',
          description: 'https://gitlab.com for gitlab.com; otherwise your self-hosted URL.',
        },
      ],
    },
    {
      id: 'apple',
      label: 'Apple',
      tutorial:
        'Apple Developer → Certificates, Identifiers & Profiles → Keys. Register a Sign in with Apple key, note the key id and team id, and download the .p8 private key. Register an App ID with Sign in with Apple enabled, then create a Services ID with the callback URL shown below.',
      extra: [
        {
          key: 'teamId',
          label: 'Team ID',
          description: 'Shown at the top right of the Apple Developer portal.',
        },
        {
          key: 'keyId',
          label: 'Key ID',
          description: 'The id of the Sign in with Apple private key.',
        },
        {
          key: 'privateKey',
          label: 'Private key (PEM)',
          description: 'Contents of the downloaded .p8 file.',
          secret: true,
        },
      ],
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      tutorial:
        'X Developer Portal → Projects & Apps → your app → User authentication settings. Enable OAuth 2.0, set the callback URL shown below, and copy the client id and secret.',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      tutorial:
        'Meta for Developers → Apps → Create/select app → Facebook Login → Settings. Add the OAuth redirect URI shown below, then copy the App ID and App Secret.',
    },
    {
      id: 'discord',
      label: 'Discord',
      tutorial:
        'Discord Developer Portal → Applications → New Application → OAuth2. Add the redirect URL shown below, then copy the client id and secret.',
    },
    {
      id: 'azure',
      label: 'Azure (Microsoft)',
      tutorial:
        'Microsoft Entra admin center → App registrations → New registration. Set the redirect URI to the callback URL shown below (Web platform), then copy the Application (client) ID and create a client secret.',
      extra: [
        {
          key: 'tenant',
          label: 'Tenant',
          description: 'common for multi-tenant, or your tenant id / verified domain.',
        },
      ],
    },
    {
      id: 'keycloak',
      label: 'Keycloak',
      tutorial:
        'Your Keycloak admin console → Clients → Create. Set the root URL and the redirect URI to the callback URL shown below, enable the email and profile mappers, then copy the client id and secret.',
      extra: [
        {
          key: 'issuer',
          label: 'Issuer URL',
          description: 'e.g. https://iam.example.com/realms/your-realm.',
        },
      ],
    },
  ];

  for (const p of providers) {
    defs[`auth.oauth.${p.id}.enabled`] = bool(
      `auth.oauth.${p.id}.enabled`,
      'oauth',
      `${p.label} sign-in`,
      p.tutorial,
      false,
      { public: true },
    );
    defs[`auth.oauth.${p.id}.clientId`] = str(
      `auth.oauth.${p.id}.clientId`,
      'oauth',
      `${p.label} client id`,
      'From your provider console.',
      '',
    );
    defs[`auth.oauth.${p.id}.clientSecret`] = secret(
      `auth.oauth.${p.id}.clientSecret`,
      'oauth',
      `${p.label} client secret`,
      'From your provider console.',
    );
    if (p.extra) {
      for (const e of p.extra) {
        defs[`auth.oauth.${p.id}.${e.key}`] = (e.secret ? secret : str)(
          `auth.oauth.${p.id}.${e.key}`,
          'oauth',
          `${p.label} ${e.label}`,
          e.description,
          '',
        );
      }
    }
  }
  return defs;
}
