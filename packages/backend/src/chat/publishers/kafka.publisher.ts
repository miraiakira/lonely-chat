import { Inject, Injectable } from '@nestjs/common'
import { KAFKA_PRODUCER } from '../../kafka/kafka.module'
import type { Producer } from 'kafkajs'
import type { ChatEvent, ChatEventPublisher } from '../chat-event.publisher'

@Injectable()
export class KafkaPublisher implements ChatEventPublisher {
  constructor(
    @Inject(KAFKA_PRODUCER) private readonly kafka: Producer,
  ) {}

  async publish(event: ChatEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'message': {
          const key = Buffer.from(String((event.payload as any)?.convId || ''))
          await this.kafka.send({
            topic: 'chat.message_sent',
            messages: [
              {
                key,
                value: Buffer.from(JSON.stringify(event.payload)),
                headers: { 'x-conv-id': Buffer.from(String((event.payload as any)?.convId || '')) } as any,
              },
            ],
          } as any)
          break
        }
        case 'group_created': {
          const key = Buffer.from(String((event.payload as any)?.id || ''))
          await this.kafka.send({
            topic: 'chat.group_created',
            messages: [
              {
                key,
                value: Buffer.from(JSON.stringify(event.payload)),
              },
            ],
          } as any)
          break
        }
      }
    } catch {}
  }
}