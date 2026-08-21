import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Role-based permission check. Reads the permission codes required by
 * the handler (@RequirePermissions), loads the user's roles, and allows
 * when any role grants any required permission. Users carrying the
 * superadmin or admin roles pass automatically.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) throw new ForbiddenException('Authentication required.');
    if (user.isAdmin) return true;

    const grants = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { select: { permissions: true } } },
    });
    const granted = new Set<string>();
    for (const g of grants) {
      for (const p of g.role.permissions) granted.add(p);
    }
    if (required.some((p) => granted.has(p))) return true;

    throw new ForbiddenException(`Missing permission: ${required.join(' or ')}.`);
  }
}
