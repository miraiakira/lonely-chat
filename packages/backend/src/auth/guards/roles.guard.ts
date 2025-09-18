import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // 支持两种形态：['admin'] 或 [{ name: 'admin' }]
    const userRoleNames: string[] = (user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r?.name)).filter(Boolean);
    return roles.some((role) => userRoleNames.includes(role));
  }
}