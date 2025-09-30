import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RewardsController } from './rewards.controller'
import { RewardsService } from './rewards.service'
import { UserReward } from './entities/user-reward.entity'
import { UserCheckin } from './entities/user-checkin.entity'
import { RewardsConfig } from './rewards.config'
import { RateLimitGuard } from './rate-limit.guard'

@Module({
  imports: [TypeOrmModule.forFeature([UserReward, UserCheckin])],
  controllers: [RewardsController],
  providers: [RewardsService, RewardsConfig, RateLimitGuard],
  exports: [RewardsService, RewardsConfig, RateLimitGuard],
})
export class RewardsModule {}