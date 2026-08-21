import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MediaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
