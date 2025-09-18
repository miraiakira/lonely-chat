import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RoleService } from '../../auth/role.service';
import { PermissionService } from '../../auth/permission.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载根目录 .env
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// 旧 -> 新 映射
const ALIASES: Record<string, string> = {
  manage_users: 'user:manage',
  manage_roles: 'role:manage',
  manage_permissions: 'permission:manage',
};

async function run() {
  // 确保本地使用 localhost 连接（与现有 seed.ts 一致）
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';

  const app = await NestFactory.createApplicationContext(AppModule);
  const roleService = app.get(RoleService);
  const permissionService = app.get(PermissionService);

  try {
    console.log('[migration] Fetching roles and permissions...');
    const roles = await roleService.findAll();
    const allPerms = await permissionService.findAll();

    // 建立名称到实体的索引
    const permByName = new Map(allPerms.map((p) => [p.name, p] as const));

    // 确保新命名权限存在
    const ensureNew = async (name: string) => {
      let p = permByName.get(name);
      if (!p) {
        p = await permissionService.create({ name });
        permByName.set(name, p);
      }
      return p;
    };

    // 对每个角色处理其权限：
    // - 如果包含任意 manage_*，移除这些旧名
    // - 添加对应的新名 :manage
    // - 最终只保留去重后的权限集合
    for (const role of roles) {
      const before = role.permissions || [];
      const keep = new Map<number, typeof before[number]>();

      // 先把原有的现代命名保留
      for (const p of before) {
        if (!Object.prototype.hasOwnProperty.call(ALIASES, p.name)) {
          if (!keep.has(p.id)) keep.set(p.id, p);
        }
      }

      // 检查旧权限是否存在于该角色
      const legacyNames = Object.keys(ALIASES).filter((oldName) => before.some((p) => p.name === oldName));
      if (legacyNames.length > 0) {
        // 加入对应的新命名权限
        const newNames = Array.from(new Set(legacyNames.map((ln) => ALIASES[ln])));
        for (const nn of newNames) {
          const canonical = await ensureNew(nn);
          keep.set(canonical.id, canonical);
        }
      }

      // 如果有变化，则写回
      const nextPerms = Array.from(keep.values());
      const changed = nextPerms.length !== (before?.length || 0) || before.some((p) => !nextPerms.find((q) => q.id === p.id));
      if (changed) {
        console.log(`[migration] Updating role ${role.name} (${role.id})`);
        await roleService.assignPermissions(role.id, nextPerms.map((p) => p.id));
      }
    }

    console.log('[migration] Done.');
  } catch (e) {
    console.error('[migration] Failed:', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();