import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { RewardsConfig } from './rewards.config'

// 简易内存限流（生产可替换为 Redis）
 type Key = string
 const counters = new Map<Key, { count: number; resetAt: number }>()

function nowSec() { return Math.floor(Date.now() / 1000) }

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly cfg: RewardsConfig) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const userId = req.user?.id
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const route = req.route?.path || req.url

    const windowSec = this.cfg.rateLimitWindowSec()
    const max = this.cfg.rateLimitMax()

    const key = `${userId || ip}:${route}`
    const now = nowSec()
    const cur = counters.get(key)

    if (!cur || cur.resetAt <= now) {
      counters.set(key, { count: 1, resetAt: now + windowSec })
      return true
    }

    if (cur.count < max) {
      cur.count += 1
      return true
    }

    throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
  }
}