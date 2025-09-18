import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Body, Post, HttpCode, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Message } from './entities/message.entity'
import { Conversation } from './entities/conversation.entity'
import { User } from '../user/user.entity'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminChatController {
  constructor(
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // 消息搜索（按内容/发送者用户名，简单分页）
  @Get('messages/search')
  async searchMessages(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const where = [] as any[]
    const query = (q || '').trim()
    if (query) {
      // 通过 content 或 sender.username 模糊匹配
      where.push({ content: ILike(`%${query}%`) })
    }

    const take = Math.max(1, Math.min(50, Number(pageSize) || 10))
    const skip = Math.max(0, ((Number(page) || 1) - 1) * take)

    const qb = this.msgRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .leftJoinAndSelect('s.profile', 'sp')
      .orderBy('m.createdAt', 'DESC')
      .take(take)
      .skip(skip)

    if (query) {
      qb.where('m.content ILIKE :q', { q: `%${query}%` }).orWhere('s.username ILIKE :q', { q: `%${query}%` })
    }

    const [items, total] = await qb.getManyAndCount()
    return {
      total,
      items: items.map((m) => ({
        id: m.id,
        user: (m as any)?.sender?.username,
        content: m.content,
        createdAt: (m as any)?.createdAt,
        status: (m as any)?.deletedAt ? 'deleted' : 'normal',
      })),
    }
  }

  // 软删除消息
  @Patch('messages/:id/soft-delete')
  async softDeleteMessage(@Param('id', ParseIntPipe) id: number, @Body('adminId') adminId?: number) {
    const msg = await this.msgRepo.findOne({ where: { id } })
    if (!msg) {
      throw new BadRequestException('Message not found')
    }
    let admin: User | null = null
    if (adminId) {
      admin = await this.userRepo.findOne({ where: { id: adminId } })
    }
    ;(msg as any).deletedAt = new Date()
    ;(msg as any).deletedBy = admin ?? null
    await this.msgRepo.save(msg)
    return { success: true }
  }

  // 用户禁言/解禁
  @Post('users/:id/mute')
  @HttpCode(200)
  async muteUser(@Param('id', ParseIntPipe) id: number, @Body() body: { until?: string | null }) {
    const u = await this.userRepo.findOne({ where: { id } })
    if (!u) throw new BadRequestException('User not found')
    if (body?.until) {
      const d = new Date(body.until)
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid until')
      ;(u as any).mutedUntil = d
    } else {
      ;(u as any).mutedUntil = null
    }
    await this.userRepo.save(u)
    return { success: true, mutedUntil: (u as any).mutedUntil }
  }

  // 会话锁定/解锁
  @Post('conversations/:id/lock')
  @HttpCode(200)
  async lockConversation(@Param('id', ParseIntPipe) id: number, @Body() body?: { lock?: boolean }) {
    const conv = await this.convRepo.findOne({ where: { id } })
    if (!conv) throw new BadRequestException('Conversation not found')
    const lock = body?.lock ?? true
    ;(conv as any).isLocked = Boolean(lock)
    await this.convRepo.save(conv)
    return { success: true, isLocked: (conv as any).isLocked }
  }

  @Post('conversations/:id/unlock')
  @HttpCode(200)
  async unlockConversation(@Param('id', ParseIntPipe) id: number) {
    const conv = await this.convRepo.findOne({ where: { id } })
    if (!conv) throw new BadRequestException('Conversation not found')
    ;(conv as any).isLocked = false
    await this.convRepo.save(conv)
    return { success: true, isLocked: (conv as any).isLocked }
  }

  @Patch('conversations/:id/notice')
  async setConversationNotice(@Param('id', ParseIntPipe) id: number, @Body() body: { notice?: string | null }) {
    const conv = await this.convRepo.findOne({ where: { id } })
    if (!conv) throw new BadRequestException('Conversation not found')
    ;(conv as any).notice = (body?.notice ?? '').slice(0, 1000) || null
    await this.convRepo.save(conv)
    return { success: true, notice: (conv as any).notice }
  }
  // 会话列表（可选：按标题搜索 + 简单分页）
  @Get('conversations')
  async listConversations(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const take = Math.max(1, Math.min(50, Number(pageSize) || 10))
    const skip = Math.max(0, ((Number(page) || 1) - 1) * take)

    const qb = this.convRepo
      .createQueryBuilder('c')
      .orderBy('c.updatedAt', 'DESC')
      .take(take)
      .skip(skip)

    const query = (q || '').trim()
    if (query) {
      qb.where('c.title ILIKE :q', { q: `%${query}%` })
    }

    const [items, total] = await qb.getManyAndCount()
    return {
      total,
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        isLocked: (c as any).isLocked ?? false,
        notice: (c as any).notice ?? null,
      })),
    }
  }
}