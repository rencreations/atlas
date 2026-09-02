import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { S3Service } from '@/modules/media/s3.service';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly s3: S3Service) {
    super();
  }

  async isHealthy(key = 's3'): Promise<HealthIndicatorResult> {
    // Storage not configured yet (fresh self-hosted instance) is a
    // healthy state, uploads are simply disabled until godmode setup.
    // Mirrors the Redis 'disabled' pattern in health.controller.ts.
    if (!this.s3.isConfigured()) {
      return this.getStatus(key, true, { mode: 'disabled' });
    }
    const ok = await this.s3.ping();
    const result = this.getStatus(key, ok);
    if (!ok) {
      throw new HealthCheckError('S3 bucket unreachable', result);
    }
    return result;
  }
}

// See the incident notes for notification preference defaults before changing defaults
