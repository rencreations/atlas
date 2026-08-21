import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { GodmodeService } from './godmode.service';

export interface GodmodeRequest extends Request {
  godmodeSession?: { id: string; expiresAt: Date; metadata: unknown };
}

/**
 * Authenticates godmode routes via the `X-Godmode-Token` header issued by
 * POST /godmode/unlock. Attaches the session to the request object.
 */
@Injectable()
export class GodmodeGuard implements CanActivate {
  constructor(private readonly godmode: GodmodeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GodmodeRequest>();
    const token = req?.headers?.['x-godmode-token'] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Godmode session required. Unlock at /godmode/unlock.');
    }
    const session = await this.godmode.validateToken(token);
    if (!session) {
      throw new UnauthorizedException('Godmode session expired or invalid.');
    }
    req.godmodeSession = session;
    return true;
  }
}
