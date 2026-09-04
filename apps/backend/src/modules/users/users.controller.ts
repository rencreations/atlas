import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GodmodeService } from '../godmode/godmode.service';
import { SetAdminDto } from './dto/set-admin.dto';
import { AvatarPresignDto, ConsentDto, UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

// Granting or revoking these two through the generic role endpoint would let
// anyone holding only `roles.manage` (not full isAdmin) mint themselves an
// admin/superadmin account, so that escalation stays behind AdminGuard's
// "Make admin" toggle instead.
const PROTECTED_ROLE_CODES = new Set(['admin', 'superadmin']);

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly godmode: GodmodeService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getMe(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  /** Presigned upload URL for the user's avatar. */
  @Post('me/avatar/presign')
  avatarPresign(@CurrentUser() user: AuthenticatedUser, @Body() dto: AvatarPresignDto) {
    return this.users.avatarPresign(user.id, dto.contentType, dto.contentLength);
  }

  /** Record consent to the current terms/privacy. */
  @Post('me/consent')
  recordConsent(@CurrentUser() user: AuthenticatedUser, @Body() _dto: ConsentDto) {
    return this.users.recordConsent(user.id);
  }

  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getDashboard(user.id);
  }

  /** Jira-style personal overview ("For me"). */
  @Get('me/for-me')
  forMe(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getForMe(user.id);
  }

  @Get('me/bookmarks')
  listBookmarks(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listBookmarks(user.id);
  }

  @Post('me/bookmarks/:projectId')
  addBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.users.addBookmark(user.id, projectId);
  }

  @Delete('me/bookmarks/:projectId')
  removeBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.users.removeBookmark(user.id, projectId);
  }

  // Intentionally unguarded beyond the global session check: this backs
  // the "invite a collaborator" search in every project's team panel, not
  // just the admin dashboard, so any signed-in member can look people up
  // by name or email. The admin dashboard's own listing (with roles and
  // suspension state) lives at GET /admin/users instead.
  @Get()
  list(
    @Query('q') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.users.listUsers({ search, page, pageSize });
  }

  @Get('me/roles')
  myRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listRoles(user.id);
  }

  // ─── Admin dashboard: roles, suspension, and account lifecycle ─────────
  // Delegated by permission (not just the isAdmin flag) so an admin can
  // hand these off to a "Manager"-style role without granting full admin.

  @Post(':id/roles')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('roles.manage')
  grantRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { roleCode: string },
  ) {
    if (PROTECTED_ROLE_CODES.has(dto.roleCode) && !actor.isAdmin) {
      throw new ForbiddenException('Only an admin can grant that role.');
    }
    return this.godmode.grantRole(id, dto.roleCode, actor.id);
  }

  @Delete(':id/roles/:roleCode')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('roles.manage')
  revokeRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleCode') roleCode: string,
  ) {
    if (PROTECTED_ROLE_CODES.has(roleCode) && !actor.isAdmin) {
      throw new ForbiddenException('Only an admin can revoke that role.');
    }
    return this.godmode.revokeRole(id, roleCode);
  }

  @Post(':id/suspend')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  suspendUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { message?: string },
  ) {
    if (actor.id === id) {
      throw new BadRequestException('You cannot suspend your own account.');
    }
    return this.godmode.suspendUser(id, dto.message, actor.id);
  }

  @Post(':id/unsuspend')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  unsuspendUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.unsuspendUser(id);
  }

  @Post(':id/sessions/revoke')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  revokeUserSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.revokeUserSessions(id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  deleteUser(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    if (actor.id === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    return this.godmode.deleteUser(id);
  }

  /** Create a user from the admin console (role-based grant). */
  @Post()
  @UseGuards(AdminGuard)
  createUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Body()
    dto: {
      email: string;
      name: string;
      password?: string;
      roleCode?: string;
    },
  ) {
    return this.users.createUser(dto, actor.id);
  }

  /** Admin-initiated password reset with forced change on next login. */
  @Post(':id/password/reset')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  adminResetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { newPassword: string },
  ) {
    return this.users.adminResetPassword(actor.id, id, dto.newPassword);
  }

  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  setAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAdminDto,
  ) {
    return this.users.setAdmin(actor.id, id, dto.isAdmin);
  }
}
