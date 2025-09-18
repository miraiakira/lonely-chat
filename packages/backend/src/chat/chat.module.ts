import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Conversation } from './entities/conversation.entity'
import { Message } from './entities/message.entity'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { User } from '../user/user.entity'
import { RealtimeModule } from '../realtime/realtime.module'
import { FileModule } from '../file/file.module'
import { KafkaModule, KAFKA_PRODUCER } from '../kafka/kafka.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RedisModule, REDIS_CLIENT } from '../redis/redis.module'
import { CHAT_EVENT_PUBLISHER } from './chat-event.publisher'
import { RedisPubSubPublisher } from './publishers/redis-pubsub.publisher'
import { RedisStreamsPublisher } from './publishers/redis-streams.publisher'
import { KafkaPublisher } from './publishers/kafka.publisher'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { AdminChatController } from './admin.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User]), forwardRef(() => RealtimeModule), FileModule, KafkaModule, ConfigModule, RedisModule],
  providers: [
    ChatService,
    {
      provide: CHAT_EVENT_PUBLISHER,
      inject: [ConfigService, REDIS_CLIENT, RealtimeGateway, KAFKA_PRODUCER],
      useFactory: (config: ConfigService, redis: any, realtime: RealtimeGateway, kafkaProducer: any) => {
        const mode = (config.get<string>('CHAT_EVENT_PUB', 'redis-pubsub') || '').toLowerCase()
        switch (mode) {
          case 'redis-streams':
            return new RedisStreamsPublisher(config, redis, realtime)
          case 'kafka':
            return new KafkaPublisher(kafkaProducer)
          case 'redis-pubsub':
          default:
            return new RedisPubSubPublisher(redis, realtime)
        }
      },
    },
  ],
  controllers: [ChatController, AdminChatController],
  exports: [ChatService, CHAT_EVENT_PUBLISHER],
})
export class ChatModule {}