import { Module } from '@nestjs/common';
import { PublicConfigController } from './public-config.controller';

@Module({
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}
