import { Module, Global, Injectable, Logger } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Kafka, type KafkaConfig, logLevel, type Producer, type IHeaders } from 'kafkajs'

export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT')
export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER')

// 轻量监控：在内存里统计 send 成功/失败次数
@Injectable()
export class KafkaMetrics {
  public sentOK = 0
  public sentFail = 0
  public dlqCount = 0
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    KafkaMetrics,
    {
      provide: KAFKA_CLIENT,
      useFactory: (config: ConfigService) => {
        const brokers = (config.get<string>('KAFKA_BROKERS') || 'localhost:9092')
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
        const kafkaConfig: KafkaConfig = {
          clientId: 'lonely-chat-api',
          brokers,
          logLevel: logLevel.NOTHING,
        }
        return new Kafka(kafkaConfig)
      },
      inject: [ConfigService],
    },
    {
      provide: KAFKA_PRODUCER,
      useFactory: (kafka: Kafka, config: ConfigService, metrics: KafkaMetrics): Producer => {
        const enabled = (config.get<string>('KAFKA_ENABLED', 'false') || 'false') === 'true'
        const logger = new Logger('KafkaProducer')

        // 本地/开发默认关闭 Kafka，返回 Noop Producer，避免 getaddrinfo ENOTFOUND kafka 等错误
        if (!enabled) {
          logger.warn('Kafka disabled (KAFKA_ENABLED=false); using noop producer')
          const noop: any = {
            connect: async () => undefined,
            disconnect: async () => undefined,
            send: async (record: any) => {
              metrics.sentOK += (record?.messages?.length || 1)
              return []
            },
            on: () => noop,
            events: {},
          }
          return noop as unknown as Producer
        }

        const producer = kafka.producer({
          retry: {
            initialRetryTime: 100,
            maxRetryTime: 2000,
            retries: 3,
          },
        } as any)
        const sampleRate = Number(config.get<string>('KAFKA_ERROR_LOG_SAMPLE', '0.1')) || 0.1
        const dlqTopic = config.get<string>('KAFKA_DLQ_TOPIC', 'user.logged_in.dlq')

        return new Proxy(producer as Producer, {
          get(target, prop, receiver) {
            if (prop === 'send') {
              return async (record: any) => {
                // 懒连接：首次发送前尝试快速连接
                try {
                  await Promise.race([
                    (target as any).connect(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('kafka connect timeout')), 1500)),
                  ]).catch(() => undefined)
                } catch {}

                try {
                  const res = await (target as any).send(record)
                  metrics.sentOK += (record?.messages?.length || 1)
                  return res
                } catch (err: any) {
                  metrics.sentFail += (record?.messages?.length || 1)
                  // 采样日志：默认 10%
                  if (Math.random() < sampleRate) {
                    logger.warn(`Kafka send failed for topic ${record?.topic}: ${err?.message || err}`)
                  }

                  // 针对 user.logged_in 的死信路由
                  if (record?.topic === 'user.logged_in') {
                    try {
                      const dlqMessages = (record.messages || []).map((m: any) => ({
                        key: m.key,
                        value: JSON.stringify({ payload: m.value?.toString?.() ?? m.value, error: String(err?.message || err), ts: Date.now() }),
                        headers: { 'x-original-topic': Buffer.from(record.topic) } as IHeaders,
                      }))
                      await (target as any).send({ topic: dlqTopic, messages: dlqMessages })
                      metrics.dlqCount += dlqMessages.length
                    } catch (dlqErr: any) {
                      // DLQ 也失败则采样告警
                      if (Math.random() < sampleRate) {
                        logger.error(`DLQ send failed for ${dlqTopic}: ${dlqErr?.message || dlqErr}`)
                      }
                    }
                  }
                  // 吞掉异常以保持调用方非阻塞（调用方已 fire-and-forget）
                  throw err
                }
              }
            }
            return Reflect.get(target, prop, receiver)
          },
        })
      },
      inject: [KAFKA_CLIENT, ConfigService, KafkaMetrics],
    },
  ],
  exports: [KAFKA_CLIENT, KAFKA_PRODUCER, KafkaMetrics],
})
export class KafkaModule {}