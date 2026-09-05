import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { GlobalSearchDto } from './dto/global-search.dto';
import { SearchService } from './search.service';

@ApiBearerAuth()
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search projects, chat, notes, files, tasks, and whiteboards' })
  run(@CurrentUser() user: AuthenticatedUser, @Query() query: GlobalSearchDto) {
    return this.search.run(user, query.q, query.limit);
  }
}
