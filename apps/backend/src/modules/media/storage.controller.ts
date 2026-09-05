import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { StorageService } from './storage.service';

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

/**
 * Local-disk storage provider endpoints. Uploads arrive here when
 * `storage.provider = local`; the URL is issued by StorageService.presignPut
 * with a short-lived HMAC token (same semantics as S3 presigned URLs, so
 * the frontend upload flow is identical for every provider).
 *
 * A route-level `express.raw` middleware (registered in main.ts) parses
 * the binary body into `req.body` before these handlers run.
 */
@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Put('local/:key(*)')
  @ApiOperation({ summary: 'Upload a file to local storage with a presigned token' })
  async putLocal(@Param('key') key: string, @Req() req: Request) {
    const contentType = String(req.headers['content-type'] ?? 'application/octet-stream').split(
      ';',
    )[0];
    const body: Buffer | undefined = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body)) {
      throw new BadRequestException('Missing binary body.');
    }
    const token = String(req.query.t ?? '');
    if (
      !this.storage.verifyToken(key, contentType, body.length, token) ||
      (await this.storage.provider()) !== 'local'
    ) {
      throw new BadRequestException('Upload link is invalid or expired.');
    }
    await this.storage.putObject(key, body, contentType);
    return { ok: true };
  }

  @Public()
  @Get('local/:key(*)')
  @ApiOperation({ summary: 'Download a file from local disk storage' })
  async getLocal(@Param('key') key: string, @Res() res: Response) {
    if ((await this.storage.provider()) !== 'local') {
      throw new NotFoundException('Object not found.');
    }
    // StorageService.putObject resolves the same path and rejects
    // traversal; reusing it here keeps the path logic in one place.
    const path = await this.storage.localFilePath(key);
    const info = await stat(path).catch(() => null);
    if (!info || !info.isFile()) {
      throw new NotFoundException('Object not found.');
    }
    res.setHeader(
      'Content-Type',
      EXT_MIME[path.slice(path.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream',
    );
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(path).pipe(res);
  }
}
