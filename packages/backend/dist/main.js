"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const seed_service_1 = require("./database/seeds/seed.service");
const express_1 = require("express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    const seeder = app.get(seed_service_1.SeedService);
    await seeder.seed();
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.use((0, cookie_parser_1.default)());
    const uploadsDir = (0, path_1.join)(__dirname, '..', 'uploads');
    app.use('/uploads', (0, express_1.static)(uploadsDir));
    app.use('/api/uploads', (0, express_1.static)(uploadsDir));
    const configService = app.get(config_1.ConfigService);
    const frontendOrigin = configService.get('FRONTEND_ORIGIN') || 'http://localhost:5173';
    const allowOrigins = new Set([frontendOrigin, 'http://localhost:3001', 'http://localhost:5173']);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowOrigins.has(origin))
                return callback(null, true);
            return callback(new Error(`CORS blocked: ${origin}`), false);
        },
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe());
    const port = configService.get('APP_PORT') || 3030;
    await app.listen(port, '0.0.0.0');
    common_1.Logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map