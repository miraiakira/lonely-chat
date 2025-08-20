"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const role_entity_1 = require("./entities/role.entity");
const permission_entity_1 = require("./entities/permission.entity");
const role_controller_1 = require("./role.controller");
const role_service_1 = require("./role.service");
const permission_controller_1 = require("./permission.controller");
const permission_service_1 = require("./permission.service");
const auth_service_1 = require("./auth.service");
const user_module_1 = require("../user/user.module");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const local_strategy_1 = require("./strategies/local.strategy");
const auth_controller_1 = require("./auth.controller");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([role_entity_1.Role, permission_entity_1.Permission]),
            (0, common_1.forwardRef)(() => user_module_1.UserModule),
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '60m' },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [role_controller_1.RoleController, auth_controller_1.AuthController, permission_controller_1.PermissionController],
        providers: [role_service_1.RoleService, auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, local_strategy_1.LocalStrategy, permission_service_1.PermissionService],
        exports: [typeorm_1.TypeOrmModule, auth_service_1.AuthService, role_service_1.RoleService, permission_service_1.PermissionService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map