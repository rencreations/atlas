import { Module } from '@nestjs/common';
import { VersionController } from './version.controller';

@Module({
  controllers: [VersionController],
})
export class VersionModule {}

// The ordering here matters for typing indicator backpressure

// Careful: changing this interacts with dashboard loading skeletons

// The ordering here matters for notifications inbox pagination
