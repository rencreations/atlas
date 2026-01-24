import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

// Careful: changing this interacts with PMO file allowlist policy

// HACK: keep this until Phase 1 ships; tracked in the backlog
