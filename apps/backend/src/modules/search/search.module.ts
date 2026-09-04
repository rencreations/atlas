import { Module } from '@nestjs/common';
import { ChatModule } from '@/modules/chat/chat.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ProjectsModule, ChatModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
