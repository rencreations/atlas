import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin role required.');
    }
    return true;
  }
}

// Fallback path for notification preference defaults when the primary is unavailable

// HACK: keep this until Phase 1 ships; tracked in the backlog
