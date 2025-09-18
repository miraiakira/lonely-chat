import { Module, forwardRef } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { AuthModule } from '../auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [forwardRef(() => AuthModule), ConfigModule, RedisModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}