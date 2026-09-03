import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { GodmodeController } from './godmode.controller';
import { GodmodeGuard } from './godmode.guard';
import { GodmodeService } from './godmode.service';
import { WebauthnService } from './webauthn.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [GodmodeController],
  providers: [GodmodeService, GodmodeGuard, WebauthnService],
  exports: [GodmodeService],
})
export class GodmodeModule {}
