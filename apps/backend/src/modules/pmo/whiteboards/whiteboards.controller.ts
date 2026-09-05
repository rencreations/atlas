import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { ProjectAccessService } from '@/modules/projects/project-access.service';
import { PmoFeatureFlagGuard } from '../guards/pmo-feature-flag.guard';
import { YjsTokenService } from '../yjs/yjs-token.service';
import { CreateWhiteboardDto } from './dto/create-whiteboard.dto';
import { PresignThumbnailDto } from './dto/presign-thumbnail.dto';
import { UpdateWhiteboardDto } from './dto/update-whiteboard.dto';
import { WhiteboardsService } from './whiteboards.service';

@ApiBearerAuth()
@ApiTags('pmo:whiteboards')
@UseGuards(PmoFeatureFlagGuard)
@Controller('projects/:slug/whiteboards')
export class WhiteboardsController {
  constructor(
    private readonly whiteboards: WhiteboardsService,
    private readonly access: ProjectAccessService,
    private readonly yjsTokens: YjsTokenService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List whiteboards in a project' })
  async list(@CurrentUser() user: AuthenticatedUser, @Param('slug') slug: string) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.list(projectId);
  }

  @Get(':wbId')
  @ApiOperation({ summary: 'Get a single whiteboard' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.get(projectId, wbId);
  }

  @Get(':wbId/export')
  @ApiOperation({ summary: 'Export a whiteboard' })
  async exportMgm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.export(projectId, wbId);
  }

  @Get(':wbId/yjs-token')
  @ApiOperation({ summary: 'Get the Yjs collaboration token and websocket URL for a whiteboard' })
  async yjsToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
    @Req() req: Request,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    const wb = await this.whiteboards.get(projectId, wbId);
    const authHeader = req.header('authorization') ?? '';
    const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return {
      token: this.yjsTokens.mint(sessionId),
      docKey: wb.yDocKey,
      wsUrl: this.config.get<string>('yjs.publicWsUrl') ?? '',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a whiteboard' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: CreateWhiteboardDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.create(user.id, projectId, dto);
  }

  @Post(':wbId/thumbnail/presign')
  @ApiOperation({ summary: 'Get a presigned upload URL for a whiteboard thumbnail' })
  async presignThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
    @Body() dto: PresignThumbnailDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.presignThumbnail(projectId, wbId, dto);
  }

  @Patch(':wbId')
  @ApiOperation({ summary: 'Update a whiteboard' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
    @Body() dto: UpdateWhiteboardDto,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.update(projectId, wbId, dto, user.id);
  }

  @Get(':wbId/revisions')
  @ApiOperation({ summary: 'List revisions of a whiteboard' })
  async listRevisions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return { revisions: await this.whiteboards.listRevisions(projectId, wbId) };
  }

  @Get(':wbId/revisions/:revisionId')
  @ApiOperation({ summary: 'Get a single revision of a whiteboard' })
  async getRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.getRevision(projectId, wbId, revisionId);
  }

  @Post(':wbId/revisions/:revisionId/restore')
  @ApiOperation({ summary: 'Restore a whiteboard to an earlier revision' })
  async restoreRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.restoreRevision(projectId, wbId, revisionId, user.id);
  }

  @Delete(':wbId')
  @ApiOperation({ summary: 'Delete a whiteboard' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Param('wbId', ParseUUIDPipe) wbId: string,
  ) {
    const { projectId, access } = await this.access.resolve(slug, user);
    this.access.assertInsider(access);
    return this.whiteboards.remove(projectId, wbId);
  }
}
