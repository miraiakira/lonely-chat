"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const role_service_1 = require("../../auth/role.service");
const permission_service_1 = require("../../auth/permission.service");
const user_service_1 = require("../../user/user.service");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
async function bootstrap() {
    process.env.DB_HOST = 'localhost';
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const roleService = app.get(role_service_1.RoleService);
    const permissionService = app.get(permission_service_1.PermissionService);
    const userService = app.get(user_service_1.UserService);
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
        await userService.create({ username: 'superadmin', password: 'password' }, ['admin']);
    }
    console.log('Super admin seeded successfully.');
    await app.close();
}
bootstrap();
//# sourceMappingURL=seed.js.map