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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const role_entity_1 = require("./entities/role.entity");
const permission_entity_1 = require("./entities/permission.entity");
let RoleService = class RoleService {
    roleRepository;
    permissionRepository;
    constructor(roleRepository, permissionRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }
    async create(role) {
        const existingRole = await this.roleRepository.findOne({ where: { name: role.name } });
        if (existingRole) {
            return existingRole;
        }
        return this.roleRepository.save(role);
    }
    async findAll() {
        return this.roleRepository.find();
    }
    async findOne(id) {
        const role = await this.roleRepository.findOne({ where: { id } });
        if (!role) {
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        }
        return role;
    }
    async update(id, role) {
        await this.roleRepository.update(id, role);
        return this.findOne(id);
    }
    async remove(id) {
        await this.roleRepository.delete(id);
    }
    async addPermissionToRole(roleId, permissionIds) {
        const role = await this.findOne(roleId);
        const permissions = await this.permissionRepository.findBy({ id: (0, typeorm_2.In)(permissionIds) });
        role.permissions = [...role.permissions, ...permissions];
        return this.roleRepository.save(role);
    }
    async removePermissionFromRole(roleId, permissionId) {
        const role = await this.findOne(roleId);
        role.permissions = role.permissions.filter((p) => p.id !== permissionId);
        return this.roleRepository.save(role);
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(1, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], RoleService);
//# sourceMappingURL=role.service.js.map