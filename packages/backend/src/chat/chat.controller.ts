import { Controller, Get, Param, ParseIntPipe, UseGuards, Req, Post, Body } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChatService } from './chat.service'
import { SendMessageDto } from './dto/send-message.dto'
import { CreateGroupDto } from './dto/create-group.dto'

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  async list(@Req() req: any) {
    const userId = req.user?.id
    return this.chat.getConversationsForUser(userId)
  }

  @Get('conversations/:id/messages')
  async messages(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id
    return this.chat.getMessages(id, userId)
  }

  @Post('conversations/:id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id
    return this.chat.markRead(id, userId)
  }

  @Post('send')
  async send(@Req() req: any, @Body() body: SendMessageDto) {
    const userId = req.user?.id
    return this.chat.sendMessage(userId, body)
  }

  @Post('group')
  async createGroup(@Req() req: any, @Body() body: CreateGroupDto) {
    const userId = req.user?.id
    return this.chat.createGroup(userId, body)
  }

  // 新增：公共群聊入口，返回公共会话ID（如不存在则创建，并把当前用户加入参与者）
  @Get('public')
  async getPublic(@Req() req: any) {
    const userId = req.user?.id
    return this.chat.getOrJoinPublic(userId)
  }
}