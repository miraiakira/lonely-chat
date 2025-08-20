"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const role_service_1 = require("../../auth/role.service");
const permission_service_1 = require("../../auth/permission.service");
const user_service_1 = require("../../user/user.service");
let SeedService = SeedService_1 = class SeedService {
    roleService;
    permissionService;
    userService;
    logger = new common_1.Logger(SeedService_1.name);
    constructor(roleService, permissionService, userService) {
        this.roleService = roleService;
        this.permissionService = permissionService;
        this.userService = userService;
    }
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
        const createdPermissions = await Promise.all(permissions.map((p) => this.permissionService.create(p)));
        this.logger.log('Permissions seeded successfully.');
        this.logger.log('Seeding roles...');
        const adminRole = await this.roleService.create({ name: 'admin' });
        await this.roleService.create({ name: 'user' });
        this.logger.log('Roles seeded successfully.');
        this.logger.log('Assigning permissions to admin role...');
        await this.roleService.assignPermissions(adminRole.id, createdPermissions.map((p) => p.id));
        this.logger.log('Permissions assigned successfully.');
        this.logger.log('Seeding super admin...');
        await this.userService.create({ username: 'superadmin', password: 'password' }, ['admin']);
        this.logger.log('Super admin seeded successfully.');
        this.logger.log('Database seeding completed.');
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [role_service_1.RoleService,
        permission_service_1.PermissionService,
        user_service_1.UserService])
], SeedService);
//# sourceMappingURL=seed.service.js.map