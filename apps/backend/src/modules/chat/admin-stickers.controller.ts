import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AdminGuard } from '@/modules/auth/guards/admin.guard';
import {
  CreateStickerPackDto,
  PresignStickerDto,
  RegisterStickerDto,
  UpdateStickerPackDto,
} from './dto/sticker.dto';
import { ChatStickersService } from './services/chat-stickers.service';

/**
 * Admin sticker library. Reuses AdminGuard so the same gate as
 * /admin/collaboration-roles applies. Operations are global, there
 * are no per-project sticker libraries by design.
 */
@ApiBearerAuth()
@ApiTags('admin')
@UseGuards(AdminGuard)
@Controller('admin/stickers')
export class AdminStickersController {
  constructor(private readonly stickers: ChatStickersService) {}

  @Get('packs')
  @ApiOperation({ summary: 'List all sticker packs' })
  listPacks() {
    return this.stickers.listAllPacks();
  }

  @Post('packs')
  @ApiOperation({ summary: 'Create a sticker pack' })
  createPack(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStickerPackDto) {
    return this.stickers.createPack(user, dto);
  }

  @Patch('packs/:packId')
  @ApiOperation({ summary: 'Update a sticker pack' })
  updatePack(@Param('packId', ParseUUIDPipe) packId: string, @Body() dto: UpdateStickerPackDto) {
    return this.stickers.updatePack(packId, dto);
  }

  @Post('packs/:packId/archive')
  @ApiOperation({ summary: 'Archive a sticker pack' })
  archivePack(@Param('packId', ParseUUIDPipe) packId: string) {
    return this.stickers.archivePack(packId);
  }

  @Post('packs/:packId/unarchive')
  @ApiOperation({ summary: 'Unarchive a sticker pack' })
  unarchivePack(@Param('packId', ParseUUIDPipe) packId: string) {
    return this.stickers.unarchivePack(packId);
  }

  @Post('packs/:packId/stickers/presign')
  @ApiOperation({ summary: 'Get a presigned upload URL for a sticker image' })
  presignSticker(@Param('packId', ParseUUIDPipe) packId: string, @Body() dto: PresignStickerDto) {
    return this.stickers.presignSticker(packId, dto);
  }

  @Post('packs/:packId/stickers')
  @ApiOperation({ summary: 'Register a new sticker in a pack' })
  registerSticker(@Param('packId', ParseUUIDPipe) packId: string, @Body() dto: RegisterStickerDto) {
    return this.stickers.registerSticker(packId, dto);
  }

  @Delete('stickers/:stickerId')
  @ApiOperation({ summary: 'Delete a sticker' })
  deleteSticker(@Param('stickerId', ParseUUIDPipe) stickerId: string) {
    return this.stickers.deleteSticker(stickerId);
  }
}
