import { Injectable, Logger } from '@nestjs/common'
import { RoleService } from '../../auth/role.service'
import { PermissionService } from '../../auth/permission.service'
import { UserService } from '../../user/user.service'

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
  ) {}

  async seed() {
    this.logger.log('Checking if seeding is required...')

    const adminUser = await this.userService.findOneByUsername('superadmin')
    if (adminUser) {
      this.logger.log('Existing superadmin found. Reconciling roles/permissions...')
    }

    this.logger.log('Start seeding database (idempotent)...')

    this.logger.log('Seeding permissions...')
    // 扩充权限集：包含菜单所需权限与历史 manage_* 权限，幂等创建
    const permissions = [
      { name: 'dashboard:view' },
      { name: 'user:read' },
      { name: 'role:read' },
      { name: 'permission:read' },
      { name: 'system:config' },
      { name: 'system:logs' },
      // 新的管理类权限（统一命名）
      { name: 'user:manage' },
      { name: 'role:manage' },
      { name: 'permission:manage' },
      // 兼容旧的管理类权限
      { name: 'manage_users' },
      { name: 'manage_roles' },
      { name: 'manage_permissions' },
    ]
    const createdPermissions = await Promise.all(
      permissions.map((p) => this.permissionService.create(p)),
    )
    this.logger.log('Permissions ensured.')

    this.logger.log('Seeding roles...')
    const adminRole = await this.roleService.create({ name: 'admin' })
    await this.roleService.create({ name: 'user' })
    this.logger.log('Roles ensured.')

    this.logger.log('Assigning permissions to admin role...')
    await this.roleService.assignPermissions(
      adminRole.id,
      createdPermissions.map((p) => p.id),
    )
    this.logger.log('Permissions assigned to admin.')

    // 仅当 superadmin 不存在时创建
    if (!adminUser) {
      this.logger.log('Seeding super admin...')
      await this.userService.create(
        { username: 'superadmin', password: 'password' },
        ['admin'],
      )
      this.logger.log('Super admin seeded successfully.')
    } else {
      this.logger.log('Super admin exists. Skipping user creation.')
    }

    // 演示用户（若不存在则创建），便于本地搜索/聊天联调
    const demoUsers: Array<{ username: string; nickname: string }> = [
      { username: 'alice', nickname: 'Alice' },
      { username: 'bob', nickname: 'Bob' },
      { username: 'carol', nickname: 'Carol' },
    ]
    for (const du of demoUsers) {
      const exists = await this.userService.findOneByUsername(du.username)
      if (exists) {
        this.logger.log(`[seed] demo user exists: ${du.username}`)
        continue
      }
      try {
        this.logger.log(`[seed] creating demo user: ${du.username}`)
        const u = await this.userService.create(
          { username: du.username, password: 'password' },
          ['user'],
        )
        try {
          // 更新昵称
          await this.userService.update(u.id, {} as any, { nickname: du.nickname } as any)
        } catch (e) {
          this.logger.warn(`[seed] set nickname failed for ${du.username}: ${e instanceof Error ? e.message : e}`)
        }
      } catch (e) {
        this.logger.warn(`[seed] create demo user failed (${du.username}): ${e instanceof Error ? e.message : e}`)
      }
    }

    this.logger.log('Database seeding completed.')
  }
}