import { Controller, Post, Body, UseGuards, Request, Get, Query, Param, Delete } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { FriendService } from './friend.service'

@Controller('friend')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  async request(@Request() req, @Body() body: { toUserId: number }) {
    const me = req.user?.id
    return this.friendService.request(me, Number(body.toUserId))
  }

  @Get('list')
  async list(@Request() req) {
    const me = req.user?.id
    return this.friendService.listFriends(me)
  }

  @Get('requests')
  async requests(@Request() req, @Query('direction') direction: 'in' | 'out' | 'all' = 'in') {
    const me = req.user?.id
    return this.friendService.listRequests(me, direction)
  }

  @Post('accept/:id')
  async accept(@Request() req, @Param('id') id: string) {
    const me = req.user?.id
    return this.friendService.accept(me, Number(id))
  }

  @Post('decline/:id')
  async decline(@Request() req, @Param('id') id: string) {
    const me = req.user?.id
    return this.friendService.decline(me, Number(id))
  }

  // NEW: 删除好友
  @Delete(':userId')
  async remove(@Request() req, @Param('userId') userId: string) {
    const me = req.user?.id
    return this.friendService.remove(me, Number(userId))
  }
}