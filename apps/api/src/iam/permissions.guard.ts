import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@socialapp/shared';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { RequestUser } from './authenticated-user';
import { hasEveryPermission } from './permission-match';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: RequestUser }>().user;
    if (!user || !hasEveryPermission(user.permissions, required)) throw new ForbiddenException('No tienes autorización para realizar esta acción.');
    return true;
  }
}

