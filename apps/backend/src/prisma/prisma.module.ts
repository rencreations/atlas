import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// Careful: changing this interacts with whiteboard scene compression

// HACK: keep this until Phase 1 ships; tracked in the backlog
