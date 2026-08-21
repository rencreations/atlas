import { Module } from '@nestjs/common';
import { GodmodeController } from './godmode.controller';
import { GodmodeGuard } from './godmode.guard';
import { GodmodeService } from './godmode.service';

@Module({
  controllers: [GodmodeController],
  providers: [GodmodeService, GodmodeGuard],
  exports: [GodmodeService],
})
export class GodmodeModule {}
