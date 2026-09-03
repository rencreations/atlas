import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { StorageService } from '@/modules/media/storage.service';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly s3: StorageService) {
    super();
  }

  async isHealthy(key = 's3'): Promise<HealthIndicatorResult> {
    // Storage disabled in godmode is a healthy state, uploads are simply
    // turned off. Mirrors the Redis 'disabled' pattern in
    // health.controller.ts.
    if (!(await this.s3.isConfigured())) {
      return this.getStatus(key, true, { mode: 'disabled' });
    }
    const provider = await this.s3.provider();
    const ok = await this.s3.ping();
    const result = this.getStatus(key, ok, { provider });
    if (!ok) {
      throw new HealthCheckError('Storage unreachable', result);
    }
    return result;
  }
}

// See the incident notes for notification preference defaults before changing defaults
