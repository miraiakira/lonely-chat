import { Inject, Injectable } from '@nestjs/common'
import { REDIS_CLIENT } from '../../redis/redis.module'
import type Redis from 'ioredis'
import { RealtimeGateway } from '../../realtime/realtime.gateway'
import type { ChatEvent, ChatEventPublisher } from '../chat-event.publisher'

@Injectable()
export class RedisPubSubPublisher implements ChatEventPublisher {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly realtime: RealtimeGateway,
  ) {}

  async publish(event: ChatEvent): Promise<void> {
    try {
      const payload = JSON.stringify({
        ...event,
        source: this.realtime.getInstanceId(),
      })
      await (this.redis as any).publish('chat:msg', payload)
    } catch {}
  }
}