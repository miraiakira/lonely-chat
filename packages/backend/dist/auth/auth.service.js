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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const bcrypt = __importStar(require("bcrypt"));
const redis_module_1 = require("../redis/redis.module");
const crypto_1 = require("crypto");
const menu_service_1 = require("../menu/menu.service");
let AuthService = class AuthService {
    jwtService;
    userService;
    menuService;
    redis;
    constructor(jwtService, userService, menuService, redis) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.menuService = menuService;
        this.redis = redis;
    }
    async validateUser(username, password) {
        const user = await this.userService.findOneByUsername(username);
        if (!user)
            return null;
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return null;
        const { password: _pwd, ...safeUser } = user;
        return safeUser;
    }
    buildPayload(user, remember) {
        return {
            username: user.username,
            sub: user.id,
            roles: user.roles.map((role) => role.name),
            remember: Boolean(remember),
        };
    }
    refreshKey(userId, jti) {
        return `refresh:user:${userId}:${jti}`;
    }
    refreshPrefix(userId) {
        return `refresh:user:${userId}:`;
    }
    async issueTokens(user, remember) {
        const payload = this.buildPayload(user, remember);
        const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
        const jti = (0, crypto_1.randomUUID)();
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d', jwtid: jti });
        const refreshHash = await bcrypt.hash(refresh_token, 10);
        const key = this.refreshKey(user.id, jti);
        await this.redis.set(key, refreshHash, 'EX', 7 * 24 * 60 * 60);
        return { access_token, refresh_token };
    }
    async refresh(user, providedRefreshToken, remember, jti) {
        if (!jti) {
            throw new Error('Missing token id');
        }
        const key = this.refreshKey(user.id, jti);
        const storedHash = await this.redis.get(key);
        if (!storedHash) {
            throw new Error('No refresh token saved');
        }
        const valid = await bcrypt.compare(providedRefreshToken, storedHash);
        if (!valid) {
            throw new Error('Invalid refresh token');
        }
        const { access_token, refresh_token } = await this.issueTokens(user, remember);
        try {
            await this.redis.del(key);
        }
        catch { }
        return { access_token, refresh_token };
    }
    async logout(userId, jti) {
        if (jti) {
            const key = this.refreshKey(userId, jti);
            await this.redis.del(key);
        }
        else {
            const prefix = this.refreshPrefix(userId);
            let cursor = '0';
            do {
                const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
                cursor = next;
                if (keys && keys.length) {
                    await this.redis.del(...keys);
                }
            } while (cursor !== '0');
        }
        return true;
    }
    async login(user, remember) {
        const { access_token, refresh_token } = await this.issueTokens(user, remember);
        return { access_token, refresh_token };
    }
    async getMe(userId) {
        const user = await this.userService.findOne(userId);
        if (!user)
            return null;
        const { password, ...safeUser } = user;
        return safeUser;
    }
    mapEntityToItem(entity) {
        return {
            id: entity.id,
            title: entity.title,
            path: entity.path,
            icon: entity.icon || undefined,
            permissions: entity.permissions || undefined,
            i18nKey: entity.i18nKey || undefined,
            isExternal: entity.isExternal || undefined,
            externalUrl: entity.externalUrl || undefined,
            children: (entity.children || []).map((c) => this.mapEntityToItem(c)),
        };
    }
    async getMenus(userId) {
        const user = await this.userService.findOne(userId);
        if (!user) {
            return [];
        }
        const perms = new Set();
        for (const role of user.roles ?? []) {
            for (const p of role.permissions ?? []) {
                if (p?.name)
                    perms.add(p.name);
            }
        }
        const aliasPairs = [
            ['manage_users', 'user:manage'],
            ['manage_roles', 'role:manage'],
            ['manage_permissions', 'permission:manage'],
        ];
        const expanded = new Set(perms);
        for (const [legacy, modern] of aliasPairs) {
            if (perms.has(legacy))
                expanded.add(modern);
            if (perms.has(modern))
                expanded.add(legacy);
        }
        const trees = await this.menuService.findAll();
        const filterTree = (nodes) => {
            const result = [];
            for (const node of nodes) {
                const children = filterTree(node.children || []);
                const required = (node.permissions || []).filter(Boolean);
                const hasPerm = required.length === 0 || required.some((p) => expanded.has(p));
                if (hasPerm || children.length > 0) {
                    result.push({ ...node, children });
                }
            }
            return result;
        };
        const filtered = filterTree(trees);
        return filtered.map((e) => this.mapEntityToItem(e));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        user_service_1.UserService,
        menu_service_1.MenuService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map