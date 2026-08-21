import { Module } from '@nestjs/common';
import { GodmodeController } from './godmode.controller';
import { GodmodeGuard } from './godmode.guard';
import { GodmodeService } from './godmode.service';
import { WebauthnService } from './webauthn.service';

@Module({
  controllers: [GodmodeController],
  providers: [GodmodeService, GodmodeGuard, WebauthnService],
  exports: [GodmodeService],
})
export class GodmodeModule {}
