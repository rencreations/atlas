import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { SettingsService } from './settings.service';

@Global()
@Module({
  providers: [CryptoService, SettingsService],
  exports: [CryptoService, SettingsService],
})
export class SettingsModule {}
