import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicConfigController } from './public-config.controller';

@Module({
  imports: [AuthModule],
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}
