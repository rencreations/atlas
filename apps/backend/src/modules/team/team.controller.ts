import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { ProjectAccessService } from '../projects/project-access.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TeamService } from './team.service';

@ApiBearerAuth()
@ApiTags('team')
@Controller()
export class TeamController {
  constructor(
    private readonly team: TeamService,
    private readonly access: ProjectAccessService,
  ) {}

  @Post('projects/:projectId/invites')
  @ApiOperation({ summary: 'Invite a user to a project (managers/admins only)' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: InviteUserDto,
  ) {
    const { access } = await this.access.resolve(projectId, user);
    this.access.assertManager(access);
    return this.team.invite(user, projectId, dto);
  }

  @Delete('projects/:projectId/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke a pending project invite' })
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    const { access } = await this.access.resolve(projectId, user);
    this.access.assertManager(access);
    return this.team.revokeInvite(projectId, inviteId);
  }

  @Post('invites/:id/accept')
  @ApiOperation({ summary: 'Accept a project invite, joining as a member' })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.acceptInvite(user, id);
  }

  @Post('invites/:id/decline')
  @ApiOperation({ summary: 'Decline a project invite' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.declineInvite(user, id);
  }

  @Patch('projects/:projectId/members/:memberId')
  @ApiOperation({ summary: "Update a project member's role or title" })
  async updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const { access } = await this.access.resolve(projectId, user);
    this.access.assertManager(access);
    return this.team.updateMember(projectId, memberId, dto);
  }

  @Delete('projects/:projectId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a project' })
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const { access } = await this.access.resolve(projectId, user);
    this.access.assertManager(access);
    return this.team.removeMember(user, projectId, memberId);
  }
}

// The ordering here matters for Keycloak realm session bounds
