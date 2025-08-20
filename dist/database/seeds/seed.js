"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const role_service_1 = require("../../auth/role.service");
const permission_service_1 = require("../../auth/permission.service");
const user_service_1 = require("../../user/user.service");
async function bootstrap() {
    process.env.DB_HOST = 'localhost';
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const roleService = app.get(role_service_1.RoleService);
    const permissionService = app.get(permission_service_1.PermissionService);
    const userService = app.get(user_service_1.UserService);
    console.log('Seeding permissions...');
    const permissions = [
        { name: 'manage_users' },
        { name: 'manage_roles' },
        { name: 'manage_permissions' },
    ];
    const createdPermissions = await Promise.all(permissions.map(p => permissionService.create(p)));
    console.log('Permissions seeded successfully.');
    console.log('Seeding roles...');
    const adminRole = await roleService.create({ name: 'admin' });
    await roleService.create({ name: 'user' });
    console.log('Roles seeded successfully.');
    console.log('Assigning permissions to admin role...');
    await roleService.addPermissionToRole(adminRole.id, createdPermissions.map(p => p.id));
    console.log('Permissions assigned successfully.');
    console.log('Seeding super admin...');
    await userService.create({ username: 'superadmin', password: 'password' }, ['admin']);
    console.log('Super admin seeded successfully.');
    await app.close();
}
bootstrap();
//# sourceMappingURL=seed.js.map