import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RoleService } from '../../auth/role.service';
import { PermissionService } from '../../auth/permission.service';
import { UserService } from '../../user/user.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

async function bootstrap() {
  // Override DB_HOST for local seeding
  process.env.DB_HOST = 'localhost';

  const app = await NestFactory.createApplicationContext(AppModule);
  const roleService = app.get(RoleService);
  const permissionService = app.get(PermissionService);
  const userService = app.get(UserService);

  console.log('Seeding permissions...');
  const permissions = [
    { name: 'dashboard:view' },
    { name: 'user:read' },
    { name: 'role:read' },
    { name: 'permission:read' },
    { name: 'system:config' },
    { name: 'system:logs' },
  ];
  const createdPermissions = await Promise.all(permissions.map(p => permissionService.create(p)));
  console.log('Permissions seeded successfully.');

  console.log('Seeding roles...');
  const adminRole = await roleService.create({ name: 'admin' });
  await roleService.create({ name: 'user' });
  console.log('Roles seeded successfully.');

  console.log('Assigning permissions to admin role...');
  await roleService.assignPermissions(adminRole.id, createdPermissions.map(p => p.id));
  console.log('Permissions assigned successfully.');

  console.log('Seeding super admin...');
  const superAdmin = await userService.findOneByUsername('superadmin');
  if (!superAdmin) {
    await userService.create(
      { username: 'superadmin', password: 'password' }, // You should use a more secure password and manage it properly
      ['admin'],
    );
  }
  console.log('Super admin seeded successfully.');

  await app.close();
}

bootstrap();