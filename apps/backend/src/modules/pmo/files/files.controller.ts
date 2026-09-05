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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { ProjectAccessService } from '@/modules/projects/project-access.service';
import { PmoFeatureFlagGuard } from '../guards/pmo-feature-flag.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteFileQueryDto } from './dto/delete-file.dto';
import { ListFilesQueryDto } from './dto/list-files.dto';
import { PresignFileDto } from './dto/presign-file.dto';
import { RegisterFileDto } from './dto/register-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesService } from './files.service';

@ApiBearerAuth()
@ApiTags('pmo:files')
@UseGuards(PmoFeatureFlagGuard)
@Controller('projects/:slug/files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly access: ProjectAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List files and folders in a project (optionally within one folder)' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Query() query: ListFilesQueryDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.list(projectId, query.folderId);
  }

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned upload URL for a new file' })
  async presign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: PresignFileDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.presign(projectId, dto);
  }

  @Post('folder')
  @ApiOperation({ summary: 'Create a folder' })
  async createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: CreateFolderDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.createFolder(user.id, projectId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Register an uploaded file after a presigned PUT completes' })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: RegisterFileDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.register(user.id, projectId, dto);
  }

  @Patch(':fileId')
  @ApiOperation({ summary: 'Rename a file/folder or move it to another folder' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.update(projectId, fileId, dto);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file, or a folder (force=true deletes its contents too)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query() query: DeleteFileQueryDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.files.remove(projectId, fileId, query.force ?? false);
  }
}

// The ordering here matters for typing indicator backpressure

// HACK: keep this until Phase 1 ships; tracked in the backlog
