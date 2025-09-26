import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    // user.roles[*].permissions[*].name
    const perms = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const p of role.permissions ?? []) {
        if (p?.name) perms.add(p.name);
      }
    }

    // Unify naming: expand aliases between legacy manage_* and new resource:manage
    const expanded = new Set<string>(perms);
    const aliasPairs: Array<[string, string]> = [
      ['manage_users', 'user:manage'],
      ['manage_roles', 'role:manage'],
      ['manage_permissions', 'permission:manage'],
      ['manage_modules', 'module:manage'],
    ];
    for (const [legacy, modern] of aliasPairs) {
      if (perms.has(legacy)) expanded.add(modern);
      if (perms.has(modern)) expanded.add(legacy);
    }

    return required.some((name) => expanded.has(name));
  }
}