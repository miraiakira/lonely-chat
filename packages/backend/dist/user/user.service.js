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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const role_entity_1 = require("../auth/entities/role.entity");
const user_profile_entity_1 = require("./user-profile.entity");
let UserService = class UserService {
    userRepository;
    roleRepository;
    userProfileRepository;
    constructor(userRepository, roleRepository, userProfileRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userProfileRepository = userProfileRepository;
    }
    async findOneByUsername(username) {
        return this.userRepository.findOne({ where: { username }, relations: ['roles'] });
    }
    async findOne(id) {
        return this.userRepository.findOne({ where: { id }, relations: ['roles', 'profile'] });
    }
    async findAll() {
        return this.userRepository.find({
            relations: ['roles', 'profile'],
        });
    }
    async remove(id) {
        await this.userRepository.delete(id);
    }
    async update(id, updateUserDto, updateUserProfileDto) {
        delete updateUserDto.password;
        delete updateUserDto.username;
        const user = await this.findOne(id);
        if (!user) {
            throw new Error('User not found');
        }
        Object.assign(user, updateUserDto);
        if (user.profile && updateUserProfileDto) {
            Object.assign(user.profile, updateUserProfileDto);
            await this.userProfileRepository.save(user.profile);
        }
        return this.userRepository.save(user);
    }
    async assignRoles(id, assignRolesDto) {
        const user = await this.findOne(id);
        if (!user) {
            throw new Error('User not found');
        }
        const roles = await this.roleRepository.findByIds(assignRolesDto.roleIds);
        user.roles = roles;
        return this.userRepository.save(user);
    }
    async create(createUserDto, roleNames) {
        const profile = new user_profile_entity_1.UserProfile();
        const user = this.userRepository.create({
            ...createUserDto,
            profile,
        });
        if (roleNames && roleNames.length > 0) {
            const roles = await this.roleRepository.createQueryBuilder('role').where('role.name IN (:...roleNames)', { roleNames }).getMany();
            user.roles = roles;
        }
        else {
            const defaultRole = await this.roleRepository.findOne({ where: { name: 'user' } });
            if (defaultRole) {
                user.roles = [defaultRole];
            }
        }
        await this.userProfileRepository.save(profile);
        return this.userRepository.save(user);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(2, (0, typeorm_1.InjectRepository)(user_profile_entity_1.UserProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map