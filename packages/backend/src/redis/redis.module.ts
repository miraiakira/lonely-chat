import { Global, Module, Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export const REDIS_CLIENT = Symbol('REDIS_CLIENT')

// 批量写入最近活跃用户的缓冲器（进程内，pipeline 批量提交）
@Injectable()
export class RecentActiveBatcher implements OnModuleDestroy {
  private readonly logger = new Logger(RecentActiveBatcher.name)
  private readonly queue: Array<{ id: string; score: number }> = []
  private flushing = false
  private timer: NodeJS.Timeout | null = null
  private readonly batchSize: number
  private readonly flushIntervalMs: number
  private readonly maxKeep: number
  private readonly maxRetry: number
  private readonly backoffBaseMs: number
  private readonly backoffMaxMs: number
  private readonly shutdownTimeoutMs: number

  // metrics
  private enqueuedTotal = 0
  private flushedTotal = 0
  private flushOkTotal = 0
  private flushFailTotal = 0
  private lastFlushAt = 0
  private lastFlushDurationMs = 0

  constructor(
    private readonly config: ConfigService,
    // 直接使用同模块导出的 Redis 客户端
    private readonly redis: Redis,
  ) {
    this.batchSize = Number(this.config.get<string>('RECENT_ACTIVE_BATCH', '200')) || 200
    this.flushIntervalMs = Number(this.config.get<string>('RECENT_ACTIVE_FLUSH_MS', '100')) || 100
    this.maxKeep = Number(this.config.get<string>('RECENT_ACTIVE_MAX_KEEP', '1000')) || 1000

    this.maxRetry = Number(this.config.get<string>('RECENT_ACTIVE_RETRY_MAX', '5')) || 5
    this.backoffBaseMs = Number(this.config.get<string>('RECENT_ACTIVE_BACKOFF_BASE_MS', '100')) || 100
    this.backoffMaxMs = Number(this.config.get<string>('RECENT_ACTIVE_BACKOFF_MAX_MS', '2000')) || 2000
    this.shutdownTimeoutMs = Number(this.config.get<string>('RECENT_ACTIVE_SHUTDOWN_TIMEOUT_MS', '1000')) || 1000
  }

  enqueue(userId: string | number, ts: number) {
    this.queue.push({ id: String(userId), score: ts })
    this.enqueuedTotal += 1
    if (!this.timer) {
      this.timer = setInterval(() => this.flush().catch(() => {}), this.flushIntervalMs)
      this.timer.unref?.()
    }
    if (this.queue.length >= this.batchSize) {
      void this.flush().catch(() => {})
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async doExec(items: Array<{ id: string; score: number }>) {
    const pipe = (this.redis as any).pipeline()
    for (const it of items) {
      pipe.zadd('recent:active_users', it.score, it.id)
    }
    // 控制集合规模，保留最近 maxKeep 个
    // 使用 rank 删除：从最旧开始删到只剩下 maxKeep 个
    pipe.zremrangebyrank('recent:active_users', 0, -this.maxKeep - 1)
    await pipe.exec()
  }

  private async flush(): Promise<boolean> {
    if (this.flushing) return false
    if (this.queue.length === 0) return true
    this.flushing = true
    const items = this.queue.splice(0, this.queue.length)
    const start = Date.now()
    try {
      let attempt = 0
      while (true) {
        try {
          await this.doExec(items)
          this.flushOkTotal += 1
          this.flushedTotal += items.length
          this.lastFlushAt = Date.now()
          this.lastFlushDurationMs = this.lastFlushAt - start
          return true
        } catch (err) {
          this.flushFailTotal += 1
          if (attempt >= this.maxRetry) {
            // 失败且超过重试上限：将 items 放回队列头，避免丢失
            // 为了尽量保持原顺序，这里逆序 unshift
            for (let i = items.length - 1; i >= 0; i--) {
              this.queue.unshift(items[i])
            }
            this.logger.warn(`RecentActive flush failed after ${attempt} retries, requeued ${items.length} items`)
            return false
          }
          const delay = Math.min(this.backoffMaxMs, this.backoffBaseMs * Math.pow(2, attempt))
          attempt += 1
          await this.sleep(delay)
        }
      }
    } finally {
      this.flushing = false
    }
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.queue.length > 0) {
      // 退出前尽量冲刷一次，但设置超时，避免阻塞关闭
      try {
        await Promise.race([
          this.flush(),
          this.sleep(this.shutdownTimeoutMs),
        ])
      } catch (e) {
        // ignore
      }
    }
  }

  // 供 /metrics 暴露
  public metrics() {
    return {
      enqueuedTotal: this.enqueuedTotal,
      flushedTotal: this.flushedTotal,
      flushOkTotal: this.flushOkTotal,
      flushFailTotal: this.flushFailTotal,
      lastFlushAt: this.lastFlushAt,
      lastFlushDurationMs: this.lastFlushDurationMs,
      queueLength: this.queue.length,
    }
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', '127.0.0.1')
        const port = parseInt(config.get<string>('REDIS_PORT', '6379'), 10)
        const password = config.get<string>('REDIS_PASSWORD')
        const db = parseInt(config.get<string>('REDIS_DB', '0'), 10)
        return new Redis({ host, port, password, db, lazyConnect: false, maxRetriesPerRequest: 1 })
      },
    },
    // RecentActiveBatcher 依赖 ConfigService 与 REDIS_CLIENT
    {
      provide: RecentActiveBatcher,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => new RecentActiveBatcher(config, redis),
    },
  ],
  exports: [REDIS_CLIENT, RecentActiveBatcher],
})
export class RedisModule {}