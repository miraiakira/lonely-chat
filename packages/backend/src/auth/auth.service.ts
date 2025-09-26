import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { MenuItem } from './dto/menu-item.dto';
import * as bcrypt from 'bcrypt';
import { REDIS_CLIENT } from '../redis/redis.module';
import { randomUUID } from 'crypto';
import { MenuService } from '../menu/menu.service';
import { Menu } from '../menu/menu.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly menuService: MenuService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userService.findOneByUsername(username);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    const { password: _pwd, ...safeUser } = user as any;
    return safeUser;
  }

  private buildPayload(user: any, remember?: boolean) {
    return {
      username: user.username,
      sub: user.id,
      roles: user.roles.map((role: any) => role.name),
      // 将 remember 放入 payload，便于刷新时沿用 Cookie 持久化策略
      remember: Boolean(remember),
    };
  }

  private refreshKey(userId: number, jti: string) {
    return `refresh:user:${userId}:${jti}`;
  }
  private refreshPrefix(userId: number) {
    return `refresh:user:${userId}:`;
  }

  async issueTokens(user: any, remember?: boolean) {
    const payload = this.buildPayload(user, remember);
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const jti = randomUUID();
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d', jwtid: jti });
    // 将刷新令牌哈希存入 Redis，键包含 jti，允许多端并行
    const refreshHash = await bcrypt.hash(refresh_token, 10);
    const key = this.refreshKey(user.id, jti);
    await this.redis.set(key, refreshHash, 'EX', 7 * 24 * 60 * 60);
    return { access_token, refresh_token };
  }

  async refresh(user: any, providedRefreshToken: string, remember: boolean, jti: string) {
    // 从 Redis 读取当前会话（jti）对应的 refresh_token 哈希并校验
    if (!jti) {
      throw new Error('Missing token id');
    }
    const key = this.refreshKey(user.id, jti);
    const storedHash: string | null = await this.redis.get(key);
    if (!storedHash) {
      throw new Error('No refresh token saved');
    }
    const valid = await bcrypt.compare(providedRefreshToken, storedHash);
    if (!valid) {
      throw new Error('Invalid refresh token');
    }
    // 轮换：签发新对（生成新的 jti 与 Redis 键），随后删除旧键
    const { access_token, refresh_token } = await this.issueTokens(user, remember);
    try {
      await this.redis.del(key);
    } catch {}
    return { access_token, refresh_token };
  }

  async logout(userId: number, jti?: string) {
    if (jti) {
      const key = this.refreshKey(userId, jti);
      await this.redis.del(key);
    } else {
      // 未提供 jti 时，删除该用户所有会话
      const prefix = this.refreshPrefix(userId);
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
        cursor = next;
        if (keys && keys.length) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    }
    return true;
  }

  async login(user: any, remember?: boolean) {
    const { access_token, refresh_token } = await this.issueTokens(user, remember);
    return { access_token, refresh_token };
  }

  // 返回当前登录用户信息（包含 profile 与 roles），去除敏感字段
  async getMe(userId: number) {
    const user = await this.userService.findOne(userId);
    if (!user) return null;
    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  private mapEntityToItem(entity: Menu): MenuItem {
    return {
      id: entity.id,
      title: entity.title,
      path: entity.path,
      icon: entity.icon || undefined,
      permissions: entity.permissions || undefined,
      i18nKey: (entity as any).i18nKey || undefined,
      isExternal: (entity as any).isExternal || undefined,
      externalUrl: (entity as any).externalUrl || undefined,
      children: (entity.children || []).map((c) => this.mapEntityToItem(c)),
    };
  }

  async getMenus(userId: number): Promise<MenuItem[]> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      return [];
    }

    // 获取用户所有权限
    const perms = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const p of role.permissions ?? []) {
        if (p?.name) perms.add(p.name);
      }
    }
    // 扩展别名：manage_* <-> resource:manage
    const aliasPairs: Array<[string, string]> = [
      ['manage_users', 'user:manage'],
      ['manage_roles', 'role:manage'],
      ['manage_permissions', 'permission:manage'],
      ['manage_modules', 'module:manage'],
    ];
    const expanded = new Set(perms);
    for (const [legacy, modern] of aliasPairs) {
      if (perms.has(legacy)) expanded.add(modern);
      if (perms.has(modern)) expanded.add(legacy);
    }

    // 读取数据库菜单（树）
    const trees = await this.menuService.findAll();

    // 过滤菜单：无权限要求显示；有权限则任一命中即可
    const filterTree = (nodes: Menu[]): Menu[] => {
      const result: Menu[] = [];
      for (const node of nodes) {
        const children = filterTree(node.children || []);
        const required = (node.permissions || []).filter(Boolean);
        const hasPerm = required.length === 0 || required.some((p) => expanded.has(p));
        if (hasPerm || children.length > 0) {
          result.push({ ...node, children } as Menu);
        }
      }
      return result;
    };

    const filtered = filterTree(trees);
    return filtered.map((e) => this.mapEntityToItem(e));
  }
}