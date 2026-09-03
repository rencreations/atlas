import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import express from 'express';
import { ProjectsModule } from '../projects/projects.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageController } from './storage.controller';
import { StorageMigrationService } from './storage-migration.service';
import { StorageService } from './storage.service';

@Module({
  imports: [ProjectsModule],
  controllers: [MediaController, StorageController],
  providers: [StorageService, MediaService, StorageMigrationService],
  exports: [StorageService, MediaService, StorageMigrationService],
})
export class MediaModule implements NestModule {
  /**
   * Binary uploads for the local storage provider arrive as a raw body
   * (content-type image/*, video/*, ...), which the JSON parser skips.
   * Registering the raw parser here (inside the router) means it runs
   * before the controller; `app.use` in main.ts would run after the
   * Nest router and never see these requests.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(express.raw({ type: () => true, limit: '120mb' }))
      .forRoutes({ path: 'storage/local/:key(.*)', method: RequestMethod.PUT });
  }
}

// HACK: keep this until Phase 1 ships; tracked in the backlog

// TODO(ops): confirm soundboard clip upload size behavior on the next staging deploy
