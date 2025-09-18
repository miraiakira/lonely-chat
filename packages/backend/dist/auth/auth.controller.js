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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const local_auth_guard_1 = require("./guards/local-auth.guard");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const common_2 = require("@nestjs/common");
const redis_module_1 = require("../redis/redis.module");
const kafka_module_1 = require("../kafka/kafka.module");
let AuthController = class AuthController {
    authService;
    jwtService;
    userService;
    redis;
    kafkaProducer;
    recentActiveBatcher;
    constructor(authService, jwtService, userService, redis, kafkaProducer, recentActiveBatcher) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.userService = userService;
        this.redis = redis;
        this.kafkaProducer = kafkaProducer;
        this.recentActiveBatcher = recentActiveBatcher;
    }
    async login(req, res) {
        const remember = Boolean(req.body?.remember);
        const { access_token, refresh_token } = await this.authService.login(req.user, remember);
        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
        };
        if (remember) {
            cookieOpts.maxAge = 7 * 24 * 60 * 60 * 1000;
        }
        res.cookie('refresh_token', refresh_token, cookieOpts);
        try {
            const now = Date.now();
            this.recentActiveBatcher.enqueue(String(req.user.id), now);
        }
        catch { }
        try {
            void this.kafkaProducer
                .send({
                topic: 'user.logged_in',
                messages: [
                    {
                        key: String(req.user.id),
                        value: JSON.stringify({ userId: req.user.id, ts: Date.now(), type: 'login' }),
                    },
                ],
            })
                .catch((err) => {
                if (Math.random() < 0.1) {
                    console.warn('[Kafka] user.logged_in send failed:', err?.message || err);
                }
            });
        }
        catch { }
        return { access_token };
    }
    async getMe(req) {
        return this.authService.getMe(req.user.id);
    }
    async getMenus(req) {
        return this.authService.getMenus(req.user.id);
    }
    async refresh(req, res) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            return { access_token: null };
        }
        try {
            const payload = (await this.jwtService.verifyAsync(refreshToken));
            const user = await this.userService.findOne(payload.sub);
            if (!user) {
                return { access_token: null };
            }
            const remember = Boolean(payload?.remember);
            const jti = payload?.jti;
            const { access_token, refresh_token } = await this.authService.refresh(user, refreshToken, remember, jti);
            const cookieOpts = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/api/auth',
            };
            if (remember) {
                cookieOpts.maxAge = 7 * 24 * 60 * 60 * 1000;
            }
            res.cookie('refresh_token', refresh_token, cookieOpts);
            try {
                const now = Date.now();
                this.recentActiveBatcher.enqueue(String(user.id), now);
            }
            catch { }
            try {
                void this.kafkaProducer
                    .send({
                    topic: 'user.logged_in',
                    messages: [
                        {
                            key: String(user.id),
                            value: JSON.stringify({ userId: user.id, ts: Date.now(), type: 'refresh' }),
                        },
                    ],
                })
                    .catch((err) => {
                    if (Math.random() < 0.1) {
                        console.warn('[Kafka] user.logged_in send failed:', err?.message || err);
                    }
                });
            }
            catch { }
            return { access_token };
        }
        catch (e) {
            res.clearCookie('refresh_token', { path: '/api/auth' });
            return { access_token: null };
        }
    }
    async logout(req, res) {
        try {
            const refreshToken = req.cookies?.refresh_token;
            if (refreshToken) {
                try {
                    const payload = (await this.jwtService.verifyAsync(refreshToken));
                    if (payload?.sub) {
                        await this.authService.logout(payload.sub, payload?.jti);
                    }
                }
                catch {
                    if (req.user?.id) {
                        await this.authService.logout(req.user.id);
                    }
                }
            }
            else if (req.user?.id) {
                await this.authService.logout(req.user.id);
            }
        }
        finally {
            res.clearCookie('refresh_token', { path: '/api/auth' });
        }
        return { success: true };
    }
    async forgotPassword(body) {
        return { success: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.UseGuards)(local_auth_guard_1.LocalAuthGuard),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('menus'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMenus", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __param(3, (0, common_2.Inject)(redis_module_1.REDIS_CLIENT)),
    __param(4, (0, common_2.Inject)(kafka_module_1.KAFKA_PRODUCER)),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        jwt_1.JwtService,
        user_service_1.UserService, Object, Object, redis_module_1.RecentActiveBatcher])
], AuthController);
//# sourceMappingURL=auth.controller.js.map