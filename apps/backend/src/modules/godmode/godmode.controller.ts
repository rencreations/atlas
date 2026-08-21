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
import { GodmodeGuard, GodmodeRequest } from './godmode.guard';
import { GodmodeService } from './godmode.service';
import {
  BulkUpdateSettingsDto,
  CreateGodmodeUserDto,
  EnableTotpDto,
  GrantRoleDto,
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
    return this.godmode.unlock(dto.passphrase, dto.totp);
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
    const [items, configured] = await Promise.all([
      this.settings.viewForGodmode(),
      this.settings.isConfigured(),
    ]);
    return { groups: SETTING_GROUPS, items, configured };
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
    await this.settings.setMany(dto.settings);
    return { ok: true };
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

  @UseGuards(GodmodeGuard)
  @Get('roles')
  listRoles() {
    return this.godmode.listRoles();
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
  @Get('2fa/status')
  async twoFactorStatus() {
    return {
      totpEnabled: await this.settings.get<boolean>('godmode.totp.enabled'),
    };
  }

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
