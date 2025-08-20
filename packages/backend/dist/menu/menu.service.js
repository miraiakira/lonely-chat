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
    create(createMenuDto) {
        const menu = this.menuRepository.create(createMenuDto);
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