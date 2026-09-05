import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ChatAvatarsService } from '../chat/services/chat-avatars.service';
import { UpsertChatAvatarDto } from './dto/chat-avatar.dto';

/**
 * Admin dashboard Chat settings. Currently manages the Discord-style
 * server avatars (workspace + per project); the keyed row shape makes
 * room for further chat configuration without schema churn.
 */
@ApiBearerAuth()
@ApiTags('admin')
@Controller('admin/chat')
@UseGuards(AdminGuard)
export class AdminChatController {
  constructor(private readonly chatAvatars: ChatAvatarsService) {}

  @Get('avatars')
  @ApiOperation({ summary: 'List chat server avatars (workspace and projects)' })
  listAvatars() {
    return this.chatAvatars.listForAdmin();
  }

  @Put('avatars/:key')
  @ApiOperation({ summary: 'Create or update a chat server avatar' })
  upsertAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpsertChatAvatarDto,
  ) {
    return this.chatAvatars.upsert(
      key,
      {
        emoji: dto.emoji ?? null,
        color: dto.color ?? null,
        imageUrl: dto.imageUrl ?? null,
      },
      user.id,
    );
  }

  @Delete('avatars/:key')
  @ApiOperation({ summary: 'Remove a chat server avatar' })
  removeAvatar(@Param('key') key: string) {
    return this.chatAvatars.remove(key);
  }
}
