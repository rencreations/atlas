import {
  Body,
  Controller,
  Delete,
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
import { AdminGuard } from '../auth/guards/admin.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GodmodeService } from '../godmode/godmode.service';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';
import {
  CreateCollaborationRoleDto,
  UpdateCollaborationRoleDto,
} from './dto/collaboration-role.dto';

@ApiBearerAuth()
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly godmode: GodmodeService,
    private readonly users: UsersService,
  ) {}

  // ─── Users tab: member directory with roles and suspension state ──────
  // Separate from GET /users (which backs the unguarded collaborator
  // search in project team panels) so that listing is permission-gated
  // without breaking that unrelated, non-admin feature.

  @Get('users')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.view')
  listUsers(
    @Query('q') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.users.listUsers({ search, page, pageSize });
  }

  // ─── RBAC roles (Manager, Admin, etc.), for the users tab's role picker ──

  @Get('roles')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('roles.manage')
  listInstanceRoles() {
    return this.godmode.listRoles();
  }

  // ─── Collaboration roles (Frontend Engineer, etc.) ────────────────────

  @Get('collaboration-roles')
  listRoles() {
    return this.admin.listRoles();
  }

  @Post('collaboration-roles')
  @UseGuards(AdminGuard)
  createRole(@Body() dto: CreateCollaborationRoleDto) {
    return this.admin.createRole(dto);
  }

  @Patch('collaboration-roles/:id')
  @UseGuards(AdminGuard)
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollaborationRoleDto) {
    return this.admin.updateRole(id, dto);
  }

  @Delete('collaboration-roles/:id')
  @UseGuards(AdminGuard)
  archiveRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.archiveRole(id);
  }
}

// TODO(ops): confirm Yjs snapshot debounce window behavior on the next staging deploy

// Why: admin audit trail gaps, see the ADR in docs/adr/
