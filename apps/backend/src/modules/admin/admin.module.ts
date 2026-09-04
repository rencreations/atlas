import { Module } from '@nestjs/common';
import { GodmodeModule } from '../godmode/godmode.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { AdminController } from './admin.controller';
import { AdminChatController } from './admin-chat.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [GodmodeModule, UsersModule, ChatModule],
  controllers: [AdminController, AdminChatController],
  providers: [AdminService],
})
export class AdminModule {}
