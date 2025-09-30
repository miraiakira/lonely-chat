import { Controller, Get, Post, UseGuards, Req, Body } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RewardsService } from './rewards.service'
import { RateLimitGuard } from './rate-limit.guard'

@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get('summary')
  async summary(@Req() req: any) {
    const userId = req.user?.id
    return this.rewards.getSummary(userId)
  }

  @UseGuards(RateLimitGuard)
  @Post('checkin')
  async checkin(@Req() req: any) {
    const userId = req.user?.id
    return this.rewards.checkin(userId)
  }

  @UseGuards(RateLimitGuard)
  @Post('claim')
  async claim(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id
    return this.rewards.claim(userId, body)
  }
}