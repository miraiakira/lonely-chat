import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileModule } from './file/file.module';
import { SeedModule } from './database/seeds/seed.module';
import { MenuModule } from './menu/menu.module';
import * as path from 'path';
import { SystemModule } from './system/system.module';
import { RedisModule } from './redis/redis.module';
import { KafkaModule } from './kafka/kafka.module';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { ChatModule } from './chat/chat.module';
import { RealtimeModule } from './realtime/realtime.module';
import { FriendModule } from './friend/friend.module';
import { PostsModule } from './posts/posts.module';
import { SearchModule } from './search/search.module';
import { RewardsModule } from './rewards/rewards.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        // Local override files come first (higher priority)
        path.resolve(process.cwd(), '../../.env.local'),
        path.resolve(process.cwd(), '.env.local'),
        // Fallback to standard .env files
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    AuthModule,
    SeedModule,
    MenuModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'admin'),
        // Ensure password is always a string to satisfy pg client requirement
        password: String(configService.get<string>('DB_PASSWORD', '111111')),
        database: configService.get<string>('DB_DATABASE', 'lonely_chat'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // 开发环境使用，生产环境请务-必关闭
      }),
      inject: [ConfigService],
    }),
    UserModule,
    FileModule,
    SystemModule,
    RedisModule,
    KafkaModule,
    ChatModule,
    RealtimeModule,
    FriendModule,
    PostsModule,
    SearchModule,
    RewardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
