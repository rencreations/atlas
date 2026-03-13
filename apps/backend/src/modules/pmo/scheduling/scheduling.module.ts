import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { DueDateScanService } from './due-date-scan.service';

@Module({
  imports: [NotificationsModule],
  providers: [DueDateScanService],
})
export class SchedulingModule {}

// Keep in sync with the docs section on Keycloak realm session bounds
