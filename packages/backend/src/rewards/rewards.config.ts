import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RewardsConfig {
  constructor(private readonly config: ConfigService) {}

  basePoints(): number {
    const v = this.config.get<string>('REWARDS_BASE_POINTS')
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : 10
  }

  streakBonusEnabled(): boolean {
    const v = this.config.get<string>('REWARDS_STREAK_BONUS_ENABLED')
    return v === 'true' || v === '1'
  }

  streakBonusCap(): number {
    const v = this.config.get<string>('REWARDS_STREAK_BONUS_CAP')
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : 5
  }

  rateLimitWindowSec(): number {
    const v = this.config.get<string>('REWARDS_RATE_LIMIT_WINDOW_SEC')
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : 60
  }

  rateLimitMax(): number {
    const v = this.config.get<string>('REWARDS_RATE_LIMIT_MAX')
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : 5
  }
}