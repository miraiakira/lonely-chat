import { Injectable, Logger } from '@nestjs/common';
import { RoleService } from '../../auth/role.service';
import { PermissionService } from '../../auth/permission.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
  ) {}

  async seed() {
    this.logger.log('Checking if seeding is required...');

    const adminUser = await this.userService.findOneByUsername('superadmin');
    if (adminUser) {
      this.logger.log('Database already seeded. Skipping.');
      return;
    }

    this.logger.log('Start seeding database...');

    this.logger.log('Seeding permissions...');
    const permissions = [
      { name: 'manage_users' },
      { name: 'manage_roles' },
      { name: 'manage_permissions' },
    ];
    const createdPermissions = await Promise.all(
      permissions.map((p) => this.permissionService.create(p)),
    );
    this.logger.log('Permissions seeded successfully.');

    this.logger.log('Seeding roles...');
    const adminRole = await this.roleService.create({ name: 'admin' });
    await this.roleService.create({ name: 'user' });
    this.logger.log('Roles seeded successfully.');

    this.logger.log('Assigning permissions to admin role...');
    await this.roleService.assignPermissions(
      adminRole.id,
      createdPermissions.map((p) => p.id),
    );
    this.logger.log('Permissions assigned successfully.');

    this.logger.log('Seeding super admin...');
    await this.userService.create(
      { username: 'superadmin', password: 'password' },
      ['admin'],
    );
    this.logger.log('Super admin seeded successfully.');

    this.logger.log('Database seeding completed.');
  }
}