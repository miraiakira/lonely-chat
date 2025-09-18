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
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const menu_entity_1 = require("./menu.entity");
let MenuService = class MenuService {
    menuRepository;
    constructor(menuRepository) {
        this.menuRepository = menuRepository;
    }
    async onModuleInit() {
        const count = await this.menuRepository.count();
        if (count === 0) {
            await this.seedDefaultMenus();
        }
    }
    async seedDefaultMenus() {
        const dashboard = this.menuRepository.create({
            title: '仪表盘',
            i18nKey: 'menu.dashboard',
            path: '/dashboard',
            component: 'Dashboard',
            icon: 'DashboardOutlined',
            order: 0,
            isExternal: false,
            hidden: false,
            permissions: null,
        });
        const users = this.menuRepository.create({
            title: '用户管理',
            i18nKey: 'menu.users',
            path: '/users',
            component: 'UserManagement',
            icon: 'UserOutlined',
            order: 1,
            isExternal: false,
            hidden: false,
            permissions: null,
        });
        const roles = this.menuRepository.create({
            title: '角色管理',
            i18nKey: 'menu.roles',
            path: '/roles',
            component: 'RoleManagement',
            icon: 'TeamOutlined',
            order: 2,
            isExternal: false,
            hidden: false,
            permissions: null,
        });
        const permissions = this.menuRepository.create({
            title: '权限管理',
            i18nKey: 'menu.permissions',
            path: '/permissions',
            component: 'PermissionManagement',
            icon: 'SafetyOutlined',
            order: 3,
            isExternal: false,
            hidden: false,
            permissions: null,
        });
        await this.menuRepository.save([dashboard, users, roles, permissions]);
        const system = this.menuRepository.create({
            title: '系统设置',
            i18nKey: 'menu.system',
            path: '/system',
            icon: 'SettingOutlined',
            order: 90,
            isExternal: false,
            hidden: false,
            permissions: null,
        });
        await this.menuRepository.save(system);
        const menuMgmt = this.menuRepository.create({
            title: '菜单管理',
            i18nKey: 'menu.system.menus',
            path: '/system/menus',
            component: 'System/MenuManagement',
            icon: 'SettingOutlined',
            order: 1,
            isExternal: false,
            hidden: false,
            permissions: null,
            parent: system,
        });
        await this.menuRepository.save(menuMgmt);
    }
    async create(createMenuDto) {
        const { parentId, ...rest } = createMenuDto;
        const menu = this.menuRepository.create(rest);
        if (parentId) {
            const parent = await this.menuRepository.findOne({ where: { id: parentId } });
            if (parent)
                menu.parent = parent;
        }
        return this.menuRepository.save(menu);
    }
    findAll() {
        return this.menuRepository.findTrees();
    }
    findOne(id) {
        return this.menuRepository.findOne({ where: { id } });
    }
    async update(id, updateMenuDto) {
        const menu = await this.findOne(id);
        if (!menu) {
            return null;
        }
        Object.assign(menu, updateMenuDto);
        return this.menuRepository.save(menu);
    }
    async remove(id) {
        const menu = await this.findOne(id);
        if (!menu) {
            return null;
        }
        return this.menuRepository.remove(menu);
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(menu_entity_1.Menu)),
    __metadata("design:paramtypes", [typeorm_2.TreeRepository])
], MenuService);
//# sourceMappingURL=menu.service.js.map