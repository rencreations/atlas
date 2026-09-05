import {
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
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { SetFeaturedDto } from './dto/set-featured.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { ProjectsService } from './projects.service';

@ApiBearerAuth()
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly access: ProjectAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List projects, with search/phase/tag/recruiting filters' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListProjectsDto) {
    return this.projects.list(user, query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'List admin-pinned featured projects, in display order' })
  featured() {
    return this.projects.listFeatured();
  }

  @Post('featured')
  @ApiOperation({ summary: 'Set the admin-pinned featured project list and order' })
  @UseGuards(AdminGuard)
  setFeatured(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetFeaturedDto) {
    return this.projects.setFeatured(user.id, dto.projectIds ?? []);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects.create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: "Get a project's details by slug" })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('slug') slug: string) {
    const { projectId, access } = await this.access.resolve(slug, user);
    return this.projects.findOne(projectId, access, user.id);
  }

  @Post(':slug/leave')
  @ApiOperation({ summary: 'Leave a project (removes your own membership)' })
  async leave(@CurrentUser() user: AuthenticatedUser, @Param('slug') slug: string) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.projects.leave(projectId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a project's details (managers/admins only)" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const { access } = await this.access.resolve(id, user);
    this.access.assertManager(access);
    return this.projects.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a project (managers/admins only)' })
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { access } = await this.access.resolve(id, user);
    this.access.assertManager(access);
    return this.projects.archive(id);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a project (managers/admins only)' })
  async unarchive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { access } = await this.access.resolve(id, user);
    this.access.assertManager(access);
    return this.projects.unarchive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a project (managers/admins only)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { access } = await this.access.resolve(id, user);
    if (access.level !== 'admin' && access.level !== 'manager') {
      throw new ForbiddenException('Only Project Managers or Admins may delete a project.');
    }
    return this.projects.softDelete(id);
  }
}
