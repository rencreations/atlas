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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GodmodeService } from '../godmode/godmode.service';
import { SetAdminDto } from './dto/set-admin.dto';
import { AvatarPresignDto, ConsentDto, UpdateMeDto, UseGravatarDto } from './dto/update-me.dto';
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
  @ApiOperation({ summary: "Get the current user's own profile" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the current user's profile (name, bio, theme, avatar key)" })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  /** Presigned upload URL for the user's avatar. */
  @Post('me/avatar/presign')
  @ApiOperation({ summary: 'Get a presigned URL to upload a new avatar image' })
  avatarPresign(@CurrentUser() user: AuthenticatedUser, @Body() dto: AvatarPresignDto) {
    return this.users.avatarPresign(user.id, dto.contentType, dto.contentLength);
  }

  /** Clears the user-uploaded avatar (falls back to Gravatar/SSO/initials). */
  @Delete('me/avatar')
  @ApiOperation({ summary: "Remove the current user's uploaded avatar" })
  removeAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.users.removeAvatar(user.id);
  }

  /**
   * Fetch and store a Gravatar image as the user's avatar, overwriting
   * any existing one. Checks the account's own email by default; pass
   * `email` to look up a Gravatar registered under a different address
   * (never changes the account's email).
   */
  @Post('me/avatar/gravatar')
  @ApiOperation({ summary: "Use a Gravatar image as the current user's avatar" })
  useGravatarAvatar(@CurrentUser() user: AuthenticatedUser, @Body() dto: UseGravatarDto) {
    return this.users.useGravatarAvatar(user.id, dto.email);
  }

  /** Record consent to the current terms/privacy. */
  @Post('me/consent')
  @ApiOperation({ summary: 'Record acceptance of the current terms/privacy policy' })
  recordConsent(@CurrentUser() user: AuthenticatedUser, @Body() _dto: ConsentDto) {
    return this.users.recordConsent(user.id);
  }

  @Get('me/dashboard')
  @ApiOperation({
    summary: "Get the current user's dashboard (managed/contributing projects, tasks)",
  })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getDashboard(user.id);
  }

  /** Jira-style personal overview ("For me"). */
  @Get('me/for-me')
  @ApiOperation({ summary: 'Get the current user\'s personal task overview ("For me")' })
  forMe(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getForMe(user.id);
  }

  @Get('me/bookmarks')
  @ApiOperation({ summary: "List the current user's saved (bookmarked) projects" })
  listBookmarks(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listBookmarks(user.id);
  }

  @Post('me/bookmarks/:projectId')
  @ApiOperation({ summary: 'Bookmark (save) a project' })
  addBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.users.addBookmark(user.id, projectId);
  }

  @Delete('me/bookmarks/:projectId')
  @ApiOperation({ summary: 'Remove a bookmark (unsave) a project' })
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
  @ApiOperation({ summary: 'Search/list users by name or email (any signed-in user)' })
  list(
    @Query('q') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.users.listUsers({ search, page, pageSize });
  }

  @Get('me/roles')
  @ApiOperation({ summary: "List the current user's role grants and permissions" })
  myRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listRoles(user.id);
  }

  // ─── Admin dashboard: roles, suspension, and account lifecycle ─────────
  // Delegated by permission (not just the isAdmin flag) so an admin can
  // hand these off to a "Manager"-style role without granting full admin.

  @Post(':id/roles')
  @ApiOperation({ summary: 'Grant a role to a user (admin/superadmin require isAdmin)' })
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
  @ApiOperation({ summary: 'Revoke a role from a user (admin/superadmin require isAdmin)' })
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
  @ApiOperation({ summary: 'Suspend a user account, blocking sign-in' })
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
  @ApiOperation({ summary: 'Lift a suspension, restoring sign-in' })
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  unsuspendUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.unsuspendUser(id);
  }

  @Post(':id/sessions/revoke')
  @ApiOperation({ summary: "Revoke all of a user's active sessions" })
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.manage')
  revokeUserSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.godmode.revokeUserSessions(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a user account' })
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
  @ApiOperation({ summary: 'Create a new user account from the admin console' })
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
  @ApiOperation({ summary: "Reset a user's password (forces a change on next login)" })
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
  @ApiOperation({ summary: "Grant or revoke a user's admin flag" })
  @UseGuards(AdminGuard)
  setAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAdminDto,
  ) {
    return this.users.setAdmin(actor.id, id, dto.isAdmin);
  }
}
