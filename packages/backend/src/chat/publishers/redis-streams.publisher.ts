import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { REDIS_CLIENT } from '../../redis/redis.module'
import type Redis from 'ioredis'
import { RealtimeGateway } from '../../realtime/realtime.gateway'
import type { ChatEvent, ChatEventPublisher } from '../chat-event.publisher'

@Injectable()
export class RedisStreamsPublisher implements ChatEventPublisher {
  private readonly streamKey: string
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly realtime: RealtimeGateway,
  ) {
    this.streamKey = this.config.get<string>('CHAT_EVENT_STREAM', 'chat:events')
  }

  async publish(event: ChatEvent): Promise<void> {
    try {
      const fields: Array<string> = [
        'type', event.type,
        'recipients', JSON.stringify(event.recipients || []),
        'payload', JSON.stringify(event.payload || {}),
        'source', this.realtime.getInstanceId(),
        'ts', String(Date.now()),
      ]
      await (this.redis as any).xadd(this.streamKey, '*', ...fields)
    } catch {}
  }
}