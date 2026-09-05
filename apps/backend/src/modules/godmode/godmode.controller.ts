import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from '@/modules/settings/settings.service';
import { SETTING_GROUPS } from '@/modules/settings/settings-registry';
import { SsoConnectionDto } from '@/modules/auth/sso-connections.service';
import { PassphraseCredentialDto } from '@/modules/auth/passphrase-credentials.service';
import { GodmodeGuard, GodmodeRequest } from './godmode.guard';
import { GodmodeService } from './godmode.service';
import {
  BulkUpdateSettingsDto,
  CreateGodmodeUserDto,
  CreateRoleDto,
  EnableTotpDto,
  GrantRoleDto,
  ResetPasswordDto,
  SuspendUserDto,
  UnlockDto,
  UpdateSettingDto,
  UpsertRoleDto,
} from './dto/godmode.dto';

@ApiTags('godmode')
@Controller('godmode')
// @Public at the class level: godmode uses its own passphrase-token auth
// (GodmodeGuard), not the user-session JwtAuthGuard.
@Public()
export class GodmodeController {
  private readonly logger = new Logger(GodmodeController.name);

  constructor(
    private readonly godmode: GodmodeService,
    private readonly settings: SettingsService,
  ) {}

  // ─── Unlock (the only unguarded mutation) ──────────────────────────

  /**
   * Unlock godmode with the passphrase from .env (GODMODE_PASSPHRASE).
   * Returns an opaque session token to send as `X-Godmode-Token`.
   */
  @Public()
  @Post('unlock')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Unlock godmode with the instance passphrase (+ optional 2FA)' })
  unlock(@Body() dto: UnlockDto) {
    return this.godmode.unlock(
      dto.passphrase,
      dto.totp,
      dto.passkey as { challenge: string; response: never } | undefined,
    );
  }

  /** Second-factor methods available at unlock time. */
  @Public()
  @Get('unlock/factors')
  @ApiOperation({ summary: 'List second-factor methods available at unlock time' })
  async unlockFactors() {
    const totpEnabled = await this.settings.get<boolean>('godmode.totp.enabled');
    const passkeyEnabled = await this.godmode.hasPasskeys();
    return { totpEnabled, passkeyEnabled };
  }

  /** Begin a passkey second-factor assertion (used at unlock). */
  @Public()
  @Post('2fa/passkey/authenticate/options')
  @ApiOperation({ summary: 'Begin a passkey second-factor assertion at unlock' })
  async passkeyAuthOptions() {
    return this.godmode.passkeyAuthenticationOptions();
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('2fa/status')
  @ApiOperation({ summary: 'Get the current godmode session TOTP/passkey status' })
  async twoFactorStatus() {
    return {
      totpEnabled: await this.settings.get<boolean>('godmode.totp.enabled'),
      passkeys: await this.godmode.listPasskeys(),
    };
  }

  /** Validate the current godmode token without side effects. */
  @Public()
  @Get('session')
  @ApiOperation({ summary: 'Validate the current godmode token without side effects' })
  session(@Req() req: GodmodeRequest) {
    const token = this.tokenOf(req);
    if (!token) return { valid: false };
    return this.godmode.validateToken(token).then((s) => ({
      valid: !!s,
      expiresAt: s?.expiresAt ?? null,
    }));
  }

  // ─── Onboarding ────────────────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('onboarding')
  @ApiOperation({ summary: 'Get first-run onboarding progress and remaining steps' })
  async onboarding() {
    return {
      configured: await this.settings.isConfigured(),
      steps: [
        { id: 'account', label: 'Create the superadmin account', done: false },
        { id: 'site', label: 'Set the site name and instance URL', done: false },
        { id: 'auth', label: 'Pick sign-in methods and configure credentials', done: false },
        { id: 'providers', label: 'Configure email, SMS, and storage providers', done: false },
        { id: 'modules', label: 'Enable the modules you want', done: false },
      ],
    };
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Mark first-run onboarding as complete' })
  async completeOnboarding() {
    await this.settings.markConfigured();
    return { configured: true };
  }

  // ─── Settings ──────────────────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('settings')
  @ApiOperation({ summary: 'List all godmode-managed settings, grouped' })
  async listSettings() {
    const [items, configured, ssoConnections, passphraseCredentials] = await Promise.all([
      this.settings.viewForGodmode(),
      this.settings.isConfigured(),
      this.godmode.listSsoConnections(),
      this.godmode.listPassphraseCredentials(),
    ]);
    return { groups: SETTING_GROUPS, items, configured, ssoConnections, passphraseCredentials };
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('settings/:key')
  @ApiOperation({ summary: 'Update a single setting value by key' })
  async setSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    await this.settings.set(key, dto.value);
    return { ok: true };
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('settings')
  @ApiOperation({ summary: 'Update multiple setting values in one call' })
  async bulkSetSettings(@Body() dto: BulkUpdateSettingsDto) {
    return this.godmode.bulkSetSettings(dto.settings);
  }

  // ─── Integrations ──────────────────────────────────────────────────

  /** Generate a VAPID key pair and save it immediately; returned once. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('integrations/vapid/generate')
  @ApiOperation({ summary: 'Generate and save a new VAPID key pair for web push' })
  generateVapidKeys() {
    return this.godmode.generateVapidKeys();
  }

  /** Cheap usage counts for the Overview page's post-launch suggestions. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get cheap usage counts for the Overview dashboard' })
  instanceStats() {
    return this.godmode.instanceStats();
  }

  // ─── Storage migration ────────────────────────────────────────────

  /** Latest storage-provider migration (progress, status, error). */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('storage/migration')
  @ApiOperation({ summary: 'Get the latest storage-provider migration status' })
  storageMigration() {
    return this.godmode.storageMigrationStatus();
  }

  /** Retry the last failed storage migration. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('storage/migration/retry')
  @ApiOperation({ summary: 'Retry the last failed storage migration' })
  async retryStorageMigration() {
    return this.godmode.retryStorageMigration();
  }

  // ─── SSO connections (tenant directories) ─────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('sso/connections')
  @ApiOperation({ summary: 'List configured SSO/OIDC/SAML connections' })
  listSsoConnections() {
    return this.godmode.listSsoConnections();
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('sso/connections')
  @ApiOperation({ summary: 'Create a new SSO/OIDC/SAML connection' })
  createSsoConnection(@Body() dto: SsoConnectionDto) {
    return this.godmode.createSsoConnection(dto);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('sso/connections/:id')
  @ApiOperation({ summary: 'Update an existing SSO connection configuration' })
  updateSsoConnection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SsoConnectionDto) {
    return this.godmode.updateSsoConnection(id, dto);
  }

  /** Quick enable/disable toggle without resending the full config. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('sso/connections/:id/enabled')
  @ApiOperation({ summary: 'Enable or disable an SSO connection' })
  toggleSsoConnection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { enabled: boolean }) {
    return this.godmode.setSsoConnectionEnabled(id, dto.enabled);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('sso/connections/:id')
  @ApiOperation({ summary: 'Delete an existing SSO connection' })
  deleteSsoConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.deleteSsoConnection(id);
  }

  // ─── Passphrase credentials (multiple instance passphrases) ───────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('passphrase-credentials')
  @ApiOperation({ summary: 'List all registered passphrase credentials' })
  listPassphraseCredentials() {
    return this.godmode.listPassphraseCredentials();
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('passphrase-credentials')
  @ApiOperation({ summary: 'Create a new passphrase credential' })
  createPassphraseCredential(@Body() dto: PassphraseCredentialDto) {
    return this.godmode.createPassphraseCredential(dto);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('passphrase-credentials/:id')
  @ApiOperation({ summary: 'Update an existing passphrase credential' })
  updatePassphraseCredential(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PassphraseCredentialDto,
  ) {
    return this.godmode.updatePassphraseCredential(id, dto);
  }

  /** Quick enable/disable toggle without resending the passphrase. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('passphrase-credentials/:id/enabled')
  @ApiOperation({ summary: 'Enable or disable a passphrase credential' })
  togglePassphraseCredential(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { enabled: boolean },
  ) {
    return this.godmode.setPassphraseCredentialEnabled(id, dto.enabled);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('passphrase-credentials/:id')
  @ApiOperation({ summary: 'Delete an existing passphrase credential' })
  deletePassphraseCredential(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.deletePassphraseCredential(id);
  }

  // ─── Users & roles ─────────────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('users')
  @ApiOperation({ summary: 'List users, optionally filtered by a search query' })
  listUsers(@Query('q') q?: string) {
    return this.godmode.listUsers(q);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users')
  @ApiOperation({ summary: 'Create a new user account' })
  createUser(@Body() dto: CreateGodmodeUserDto) {
    return this.godmode.createUser(dto);
  }

  /** Issue a single-use registration invite code (optional email binding). */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('invites')
  @ApiOperation({ summary: 'Issue a single-use registration invite code' })
  issueInvite(@Body() dto: { email?: string }) {
    return this.godmode.issueInviteCode(dto.email);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Grant a role to a user' })
  grantRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantRoleDto,
    @Req() req: GodmodeRequest,
  ) {
    return this.godmode.grantRole(id, dto.roleCode, req.godmodeSession?.id);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('users/:id/roles/:roleCode')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  revokeRole(@Param('id', ParseUUIDPipe) id: string, @Param('roleCode') roleCode: string) {
    return this.godmode.revokeRole(id, roleCode);
  }

  /** Suspend an account. Sessions are revoked so the lockout is immediate. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account and revoke all sessions' })
  suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: GodmodeRequest,
  ) {
    return this.godmode.suspendUser(id, dto.message, req.godmodeSession?.id);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend a previously suspended user account' })
  unsuspendUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.unsuspendUser(id);
  }

  /** Hard-delete the account and its personal data. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete a user account and its data' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.deleteUser(id);
  }

  /** Set or reset the account's local password (forces a change on login). */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users/:id/password')
  @ApiOperation({ summary: 'Set or reset a user password, forcing a change on login' })
  resetUserPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.godmode.resetUserPassword(id, dto.password);
  }

  /** Sign the account out of every device. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('users/:id/sessions/revoke')
  @ApiOperation({ summary: 'Revoke all sessions and sign a user out of every device' })
  revokeUserSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.revokeUserSessions(id);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('roles')
  @ApiOperation({ summary: 'List all roles defined on the instance' })
  listRoles() {
    return this.godmode.listRoles();
  }

  /** Create a custom role; the code is derived from the name. */
  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('roles')
  @ApiOperation({ summary: 'Create a new custom role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.godmode.createRole(dto);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Put('roles')
  @ApiOperation({ summary: 'Create or update a role and its permissions' })
  upsertRole(@Body() dto: UpsertRoleDto) {
    return this.godmode.upsertRole(dto);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('roles/:roleCode')
  @ApiOperation({ summary: 'Delete a role from the instance' })
  deleteRole(@Param('roleCode') roleCode: string) {
    return this.godmode.deleteRole(roleCode);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Get('permissions')
  @ApiOperation({ summary: 'List all available permission codes' })
  listPermissions() {
    return this.godmode.listPermissions();
  }

  // ─── Godmode 2FA ───────────────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/setup')
  @ApiOperation({ summary: 'Start TOTP setup and get a new shared secret' })
  async setupTotp() {
    return this.godmode.generateTotpSecret();
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/enable')
  @ApiOperation({ summary: 'Enable TOTP by verifying a secret and code' })
  async enableTotp(@Body() dto: EnableTotpDto) {
    await this.godmode.enableTotp(dto.secret, dto.code);
    return { enabled: true };
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/disable')
  @ApiOperation({ summary: 'Disable the TOTP second factor' })
  async disableTotp() {
    await this.godmode.disableTotp();
    return { enabled: false };
  }

  // ─── Passkeys (WebAuthn) ───────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('2fa/passkey/register/options')
  @ApiOperation({ summary: 'Begin passkey registration and get WebAuthn options' })
  passkeyRegisterOptions() {
    return this.godmode.passkeyRegistrationOptions();
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('2fa/passkey/register/verify')
  @ApiOperation({ summary: 'Verify and save a passkey registration' })
  passkeyRegisterVerify(@Body() dto: { challenge: string; response: unknown }) {
    return this.godmode.verifyPasskeyRegistration(dto.challenge, dto.response as never);
  }

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Delete('2fa/passkey/:id')
  @ApiOperation({ summary: 'Remove a previously registered passkey' })
  async deletePasskey(@Param('id') id: string) {
    await this.godmode.deletePasskey(id);
    return { ok: true };
  }

  // ─── Logout ────────────────────────────────────────────────────────

  @ApiSecurity('godmode-token')
  @UseGuards(GodmodeGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Sign out of godmode and revoke the current token' })
  async logout(@Req() req: GodmodeRequest) {
    const token = this.tokenOf(req);
    if (token) await this.godmode.revokeToken(token);
    return { ok: true };
  }

  private tokenOf(req: GodmodeRequest): string | null {
    const raw = req.headers?.['x-godmode-token'];
    return typeof raw === 'string' ? raw : null;
  }
}
