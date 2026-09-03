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
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from '@/modules/settings/settings.service';
import { SETTING_GROUPS } from '@/modules/settings/settings-registry';
import { SsoConnectionDto } from '@/modules/auth/sso-connections.service';
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
  async unlockFactors() {
    const totpEnabled = await this.settings.get<boolean>('godmode.totp.enabled');
    const passkeyEnabled = await this.godmode.hasPasskeys();
    return { totpEnabled, passkeyEnabled };
  }

  /** Begin a passkey second-factor assertion (used at unlock). */
  @Public()
  @Post('2fa/passkey/authenticate/options')
  async passkeyAuthOptions() {
    return this.godmode.passkeyAuthenticationOptions();
  }

  @UseGuards(GodmodeGuard)
  @Get('2fa/status')
  async twoFactorStatus() {
    return {
      totpEnabled: await this.settings.get<boolean>('godmode.totp.enabled'),
      passkeys: await this.godmode.listPasskeys(),
    };
  }

  /** Validate the current godmode token without side effects. */
  @Public()
  @Get('session')
  session(@Req() req: GodmodeRequest) {
    const token = this.tokenOf(req);
    if (!token) return { valid: false };
    return this.godmode.validateToken(token).then((s) => ({
      valid: !!s,
      expiresAt: s?.expiresAt ?? null,
    }));
  }

  // ─── Onboarding ────────────────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Get('onboarding')
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

  @UseGuards(GodmodeGuard)
  @Post('onboarding/complete')
  async completeOnboarding() {
    await this.settings.markConfigured();
    return { configured: true };
  }

  // ─── Settings ──────────────────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Get('settings')
  async listSettings() {
    const [items, configured, ssoConnections] = await Promise.all([
      this.settings.viewForGodmode(),
      this.settings.isConfigured(),
      this.godmode.listSsoConnections(),
    ]);
    return { groups: SETTING_GROUPS, items, configured, ssoConnections };
  }

  @UseGuards(GodmodeGuard)
  @Put('settings/:key')
  async setSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    await this.settings.set(key, dto.value);
    return { ok: true };
  }

  @UseGuards(GodmodeGuard)
  @Put('settings')
  async bulkSetSettings(@Body() dto: BulkUpdateSettingsDto) {
    return this.godmode.bulkSetSettings(dto.settings);
  }

  // ─── Storage migration ────────────────────────────────────────────

  /** Latest storage-provider migration (progress, status, error). */
  @UseGuards(GodmodeGuard)
  @Get('storage/migration')
  storageMigration() {
    return this.godmode.storageMigrationStatus();
  }

  /** Retry the last failed storage migration. */
  @UseGuards(GodmodeGuard)
  @Post('storage/migration/retry')
  async retryStorageMigration() {
    return this.godmode.retryStorageMigration();
  }

  // ─── SSO connections (tenant directories) ─────────────────────────

  @UseGuards(GodmodeGuard)
  @Get('sso/connections')
  listSsoConnections() {
    return this.godmode.listSsoConnections();
  }

  @UseGuards(GodmodeGuard)
  @Post('sso/connections')
  createSsoConnection(@Body() dto: SsoConnectionDto) {
    return this.godmode.createSsoConnection(dto);
  }

  @UseGuards(GodmodeGuard)
  @Put('sso/connections/:id')
  updateSsoConnection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SsoConnectionDto) {
    return this.godmode.updateSsoConnection(id, dto);
  }

  /** Quick enable/disable toggle without resending the full config. */
  @UseGuards(GodmodeGuard)
  @Put('sso/connections/:id/enabled')
  toggleSsoConnection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { enabled: boolean }) {
    return this.godmode.setSsoConnectionEnabled(id, dto.enabled);
  }

  @UseGuards(GodmodeGuard)
  @Delete('sso/connections/:id')
  deleteSsoConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.deleteSsoConnection(id);
  }

  // ─── Users & roles ─────────────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Get('users')
  listUsers(@Query('q') q?: string) {
    return this.godmode.listUsers(q);
  }

  @UseGuards(GodmodeGuard)
  @Post('users')
  createUser(@Body() dto: CreateGodmodeUserDto) {
    return this.godmode.createUser(dto);
  }

  /** Issue a single-use registration invite code (optional email binding). */
  @UseGuards(GodmodeGuard)
  @Post('invites')
  issueInvite(@Body() dto: { email?: string }) {
    return this.godmode.issueInviteCode(dto.email);
  }

  @UseGuards(GodmodeGuard)
  @Post('users/:id/roles')
  grantRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantRoleDto,
    @Req() req: GodmodeRequest,
  ) {
    return this.godmode.grantRole(id, dto.roleCode, req.godmodeSession?.id);
  }

  @UseGuards(GodmodeGuard)
  @Delete('users/:id/roles/:roleCode')
  revokeRole(@Param('id', ParseUUIDPipe) id: string, @Param('roleCode') roleCode: string) {
    return this.godmode.revokeRole(id, roleCode);
  }

  /** Suspend an account. Sessions are revoked so the lockout is immediate. */
  @UseGuards(GodmodeGuard)
  @Post('users/:id/suspend')
  suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: GodmodeRequest,
  ) {
    return this.godmode.suspendUser(id, dto.message, req.godmodeSession?.id);
  }

  @UseGuards(GodmodeGuard)
  @Post('users/:id/unsuspend')
  unsuspendUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.unsuspendUser(id);
  }

  /** Hard-delete the account and its personal data. */
  @UseGuards(GodmodeGuard)
  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.deleteUser(id);
  }

  /** Set or reset the account's local password (forces a change on login). */
  @UseGuards(GodmodeGuard)
  @Post('users/:id/password')
  resetUserPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.godmode.resetUserPassword(id, dto.password);
  }

  /** Sign the account out of every device. */
  @UseGuards(GodmodeGuard)
  @Post('users/:id/sessions/revoke')
  revokeUserSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.revokeUserSessions(id);
  }

  @UseGuards(GodmodeGuard)
  @Get('roles')
  listRoles() {
    return this.godmode.listRoles();
  }

  /** Create a custom role; the code is derived from the name. */
  @UseGuards(GodmodeGuard)
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.godmode.createRole(dto);
  }

  @UseGuards(GodmodeGuard)
  @Put('roles')
  upsertRole(@Body() dto: UpsertRoleDto) {
    return this.godmode.upsertRole(dto);
  }

  @UseGuards(GodmodeGuard)
  @Delete('roles/:roleCode')
  deleteRole(@Param('roleCode') roleCode: string) {
    return this.godmode.deleteRole(roleCode);
  }

  @UseGuards(GodmodeGuard)
  @Get('permissions')
  listPermissions() {
    return this.godmode.listPermissions();
  }

  // ─── Godmode 2FA ───────────────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/setup')
  async setupTotp() {
    return this.godmode.generateTotpSecret();
  }

  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/enable')
  async enableTotp(@Body() dto: EnableTotpDto) {
    await this.godmode.enableTotp(dto.secret, dto.code);
    return { enabled: true };
  }

  @UseGuards(GodmodeGuard)
  @Post('2fa/totp/disable')
  async disableTotp() {
    await this.godmode.disableTotp();
    return { enabled: false };
  }

  // ─── Passkeys (WebAuthn) ───────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Post('2fa/passkey/register/options')
  passkeyRegisterOptions() {
    return this.godmode.passkeyRegistrationOptions();
  }

  @UseGuards(GodmodeGuard)
  @Post('2fa/passkey/register/verify')
  passkeyRegisterVerify(@Body() dto: { challenge: string; response: unknown }) {
    return this.godmode.verifyPasskeyRegistration(dto.challenge, dto.response as never);
  }

  @UseGuards(GodmodeGuard)
  @Delete('2fa/passkey/:id')
  async deletePasskey(@Param('id') id: string) {
    await this.godmode.deletePasskey(id);
    return { ok: true };
  }

  // ─── Logout ────────────────────────────────────────────────────────

  @UseGuards(GodmodeGuard)
  @Post('logout')
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
