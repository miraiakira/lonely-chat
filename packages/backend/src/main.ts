import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './database/seeds/seed.service';
import { json, urlencoded, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const seeder = app.get(SeedService);
  await seeder.seed();

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // 公开静态资源：头像等文件位于 packages/backend/uploads
  const uploadsDir = join(__dirname, '..', 'uploads');
  app.use('/uploads', expressStatic(uploadsDir));
  // 兼容历史路径：/api/uploads 也指向同一目录
  app.use('/api/uploads', expressStatic(uploadsDir));

  const configService = app.get(ConfigService);
  // 允许本地 C-frontend (3001) 与默认前端 (5173)
  const frontendOrigin =
    configService.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173';
  const allowOrigins = new Set<string>([frontendOrigin, 'http://localhost:3001', 'http://localhost:5173']);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  const port = configService.get<number>('APP_PORT') || 3030;
  await app.listen(port, '0.0.0.0');
  Logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
