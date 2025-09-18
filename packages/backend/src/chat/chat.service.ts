import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Conversation } from './entities/conversation.entity'
import { Message } from './entities/message.entity'
import { User } from '../user/user.entity'
import { SendMessageDto } from './dto/send-message.dto'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { FileService } from '../file/file.service'
import * as http from 'node:http'
import * as https from 'node:https'
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'
import { CHAT_EVENT_PUBLISHER, type ChatEventPublisher } from './chat-event.publisher'

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly realtime: RealtimeGateway,
    private readonly fileService: FileService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(CHAT_EVENT_PUBLISHER) private readonly publisher: ChatEventPublisher,
  ) {}

  private async ensureParticipant(convId: number, userId: number) {
    const conv = await this.convRepo.findOne({
      where: { id: convId },
      relations: ['participants'],
    })
    if (!conv) throw new NotFoundException('Conversation not found')
    const ok = conv.participants.some((u) => u.id === userId)
    if (!ok) throw new ForbiddenException('Not a participant')
    return conv
  }

  private async findOrCreateDirect(userId: number, otherUserId: number) {
    if (userId === otherUserId) throw new ForbiddenException('Cannot chat with self')
    // try find existing direct conversation
    let conv = await this.convRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p1', 'p1.id = :me', { me: userId })
      .innerJoin('c.participants', 'p2', 'p2.id = :other', { other: otherUserId })
      .andWhere('c.isGroup = false')
      .getOne()
    if (conv) return conv
    // create
    const me = await this.userRepo.findOne({ where: { id: userId }, relations: ['profile'] })
    const other = await this.userRepo.findOne({ where: { id: otherUserId }, relations: ['profile'] })
    if (!me || !other) throw new NotFoundException('User not found')
    conv = this.convRepo.create({ isGroup: false, title: null, participants: [me, other], lastMessageAt: null })
    conv = await this.convRepo.save(conv)
    // 初始化标题与头像
    const title = this.buildDefaultTitle({ ...conv, participants: [me, other] } as any, userId)
    const avatar = await this.composeAvatarFor({ ...conv, participants: [me, other] } as any)
    try { await this.convRepo.update({ id: conv.id }, { title, avatar }) } catch {}
    return { ...conv, title, avatar }
  }

  async getConversationsForUser(userId: number) {
    const convs = await this.convRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'me', 'me.id = :uid', { uid: userId })
      .leftJoinAndSelect('c.participants', 'p')
      .leftJoinAndSelect('p.profile', 'pp')
      .orderBy('c.updatedAt', 'DESC')
      .getMany()

    const results = [] as Array<{ id: string; name: string; last: string; unread: number; avatar?: string | null }>
    for (const c of convs) {
      const lastMsg = await this.msgRepo.findOne({ where: { conversation: { id: c.id } }, order: { createdAt: 'DESC' } })
      const participants = c.participants || []
      const others = participants.filter((u) => u.id !== userId)

      let name: string
      if (c.isGroup) {
        const top2 = others
          .slice(0, 2)
          .map((u) => (u as any)?.profile?.nickname || u.username)
          .filter(Boolean)
        name = top2.length > 0 ? `与${top2.join('、')}...的聊天` : `与...的聊天`
      } else {
        const other = others[0]
        const display = (other as any)?.profile?.nickname || other?.username || 'Ta'
        name = `与${display}的聊天`
      }

      let avatar = (c as any).avatar || null
      const looksLikeOldComposed = typeof avatar === 'string' && avatar.includes('/conv-') && !avatar.includes('/conv2-')
      if (!avatar || looksLikeOldComposed) {
        try {
          const composed = await this.composeAvatarFor(c as any)
          if (composed) {
            avatar = composed
            try { await this.convRepo.update({ id: c.id }, { avatar }) } catch {}
          }
        } catch {}
      }
      if (!avatar && !c.isGroup) {
        const other = others[0] as any
        if (other?.profile?.avatar) {
          avatar = other.profile.avatar
          try { await this.convRepo.update({ id: c.id }, { avatar }) } catch {}
        }
      }
      results.push({ id: String(c.id), name, last: (lastMsg?.content && lastMsg.content.trim() !== '') ? lastMsg.content : ((lastMsg?.images && lastMsg.images.length > 0) ? '[图片]' : ''), unread: 0, avatar })
    }

    // 使用 Redis 读取未读计数
    try {
      const convIds = results.map(r => r.id)
      if (convIds.length > 0) {
        const values = await (this.redis as any).hmget(`unread:user:${userId}`, ...convIds)
        for (let i = 0; i < results.length; i++) {
          const raw = Array.isArray(values) ? values[i] : null
          const n = Number(raw || 0)
          ;(results[i] as any).unread = Number.isFinite(n) && n > 0 ? n : 0
        }
      }
    } catch {}

    return results
  }

  async getMessages(convId: number, userId: number) {
    await this.ensureParticipant(convId, userId)
    const msgs = await this.msgRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .leftJoinAndSelect('s.profile', 'sp')
      .leftJoin('m.conversation', 'c')
      .where('c.id = :cid', { cid: convId })
      .orderBy('m.createdAt', 'ASC')
      .getMany()

    // 进入会话视为已读：清除未读计数
    try { await (this.redis as any).hdel(`unread:user:${userId}`, String(convId)) } catch {}

    return msgs.map((m: any) => ({
      id: String(m.id),
      convId: String(convId),
      senderId: String(m.sender?.id),
      content: m.content,
      images: m.images || null,
      timestamp: m.createdAt.getTime(),
      senderName: m.sender?.profile?.nickname || m.sender?.username,
      senderAvatar: m.sender?.profile?.avatar || null,
    }))
  }
  async createGroup(creatorId: number, dto: { title?: string; participantIds: number[] }) {
    const uniqueIds = Array.from(new Set([...(dto.participantIds || [])].map((n) => Number(n)).filter((n) => Number.isFinite(n))))
    if (uniqueIds.length === 0) throw new ForbiddenException('At least one participant required')

    const allIds = Array.from(new Set([creatorId, ...uniqueIds]))
    const users = await this.userRepo.find({ where: { id: In(allIds) }, relations: ['profile'] })
    if (users.length < 2) throw new ForbiddenException('Not enough participants')

    let conv = this.convRepo.create({ isGroup: true, title: dto.title || null, participants: users, lastMessageAt: null })
    conv = await this.convRepo.save(conv)

    const name = this.buildDefaultTitle({ ...conv, participants: users } as any, creatorId)
    let avatar: string | null = null
    try { avatar = await this.composeAvatarFor({ ...conv, participants: users } as any) } catch {}
    try { await this.convRepo.update({ id: conv.id }, { title: name, avatar }) } catch {}

    // 统一通过 Publisher 发布“群聊创建”事件
    try {
      await this.publisher.publish({
        type: 'group_created',
        recipients: users.map(u => String(u.id)),
        payload: { id: String(conv.id), title: name, avatar, participants: users.map(u => String(u.id)) },
      })
    } catch {}

    return { id: String(conv.id), name, avatar }
  }

  // 新增：获取或加入公共群聊。若不存在则创建；若未加入则自动将当前用户加入参与者。
  async getOrJoinPublic(userId: number): Promise<{ id: string; name: string; avatar?: string | null }> {
    const me = await this.userRepo.findOne({ where: { id: userId }, relations: ['profile'] })
    if (!me) throw new NotFoundException('User not found')

    let conv = await this.convRepo.findOne({ where: { isPublic: true }, relations: ['participants'] })
    if (!conv) {
      // 创建公共群聊
      conv = this.convRepo.create({ isGroup: true, isPublic: true, title: '公共广场', participants: [me], lastMessageAt: null })
      conv = await this.convRepo.save(conv)
      let avatar: string | null = null
      try { avatar = await this.composeAvatarFor({ ...conv, participants: [me] } as any) } catch {}
      try { await this.convRepo.update({ id: conv.id }, { avatar }) } catch {}
      return { id: String(conv.id), name: conv.title || '公共广场', avatar }
    }

    // 确保当前用户在参与者列表中
    const already = (conv.participants || []).some(u => u.id === me.id)
    if (!already) {
      const updated = this.convRepo.create({ ...conv, participants: [...(conv.participants || []), me] })
      conv = await this.convRepo.save(updated)
    }

    const name = (conv as any).title || '公共广场'
    const avatar = (conv as any).avatar || null
    return { id: String(conv.id), name, avatar }
  }

   async sendMessage(userId: number, dto: SendMessageDto) {
    const { convId, toUserId, content, images } = dto
    let conv: Conversation
    if (convId) {
      conv = await this.ensureParticipant(convId, userId)
    } else if (toUserId) {
      conv = await this.findOrCreateDirect(userId, toUserId)
    } else {
      throw new NotFoundException('convId or toUserId required')
    }

    const sender = await this.userRepo.findOne({ where: { id: userId }, relations: ['profile'] })
    if (!sender) throw new NotFoundException('Sender not found')

    const msg = this.msgRepo.create({ conversation: conv, sender, content: content ?? '', images: (images && images.length > 0) ? images : null })
    const saved = await this.msgRepo.save(msg)

    await this.convRepo.update({ id: conv.id }, { lastMessageAt: saved.createdAt })

    const payload = {
      id: String(saved.id),
      convId: String(conv.id),
      senderId: String(sender.id),
      content: saved.content,
      images: saved.images || null,
      timestamp: saved.createdAt.getTime(),
      senderName: (sender as any)?.profile?.nickname || sender.username,
      senderAvatar: (sender as any)?.profile?.avatar || null,
    }

    // emit to all participants rooms (including sender)
    const participants = (await this.convRepo.findOne({ where: { id: conv.id }, relations: ['participants'] }))?.participants || []
    const rooms = participants.map((u) => `user:${u.id}`)
    try {
      this.realtime.server.to(rooms).emit('message', payload)
    } catch {}

    // 统一通过 Publisher 跨实例广播消息
    try {
      await this.publisher.publish({
        type: 'message',
        recipients: participants.map(u => String(u.id)),
        payload,
      })
    } catch {}

    // 对除发送者外的参与者增加未读计数（Redis）
    try {
      const pipe = (this.redis as any).pipeline()
      for (const u of participants) {
        if (u.id === sender.id) continue
        pipe.hincrby(`unread:user:${u.id}`, String(conv.id), 1)
      }
      await pipe.exec()
    } catch {}

    return payload
  }

  // === Helpers ===
  private buildDefaultTitle(conv: Conversation, currentUserId: number): string {
    const participants = (conv as any).participants || []
    if (conv.isGroup) {
      const names = participants
        .map((u: User) => (u as any)?.profile?.nickname || u?.username)
        .filter(Boolean)
      if ((conv as any).title) return (conv as any).title as string
      if (names.length === 0) return `与...的聊天`
      const first2 = names.slice(0, 2).join('、')
      return names.length > 2 ? `与${first2}...的聊天` : `与${first2}的聊天`
    }
    const other = participants.find((u: User) => u?.id !== currentUserId) as any
    const display = other?.profile?.nickname || other?.username || 'Ta'
    return `与${display}的聊天`
  }

  // 将远端图片下载为 data URI，避免 SVG 内嵌外链引发跨域/鉴权问题
  private async fetchAsDataUri(url: string): Promise<string | null> {
    try {
      if (!url) return null
      if (url.startsWith('data:')) return url
      const client = url.startsWith('https:') ? https : http
      return await new Promise<string | null>((resolve) => {
        client.get(url, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // 简单处理 3xx 跳转
            this.fetchAsDataUri(res.headers.location).then(resolve).catch(() => resolve(null))
            return
          }
          if ((res.statusCode || 0) >= 400) {
            resolve(null)
            return
          }
          const ctype = res.headers['content-type'] || 'image/jpeg'
          const chunks: Buffer[] = []
          res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)))
          res.on('end', () => {
            try {
              const buf = Buffer.concat(chunks)
              const b64 = buf.toString('base64')
              resolve(`data:${ctype};base64,${b64}`)
            } catch {
              resolve(null)
            }
          })
          res.on('error', () => resolve(null))
        }).on('error', () => resolve(null))
      })
    } catch {
      return null
    }
  }

  private async composeAvatarFor(conv: Pick<Conversation, 'isGroup'> & { participants?: User[] } ): Promise<string | null> {
    // 读取参与者头像，单聊最多2人，群聊最多4人
    const users = (conv.participants || []).slice(0, conv.isGroup ? 4 : 2)
    const avatarUrls = users.map(u => u.profile?.avatar).filter(Boolean) as string[]
    if (avatarUrls.length === 0) return null

    const dataUris = (await Promise.all(avatarUrls.map((u) => this.fetchAsDataUri(u)))).filter(Boolean) as string[]
    if (dataUris.length === 0) return null

    const size = 128
    const count = Math.min(dataUris.length, conv.isGroup ? 4 : 2)
    let images = ''

    if (count === 1) {
      images = `<image href="${dataUris[0]}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>`
    } else if (count === 2) {
      const half = size / 2
      images = dataUris.slice(0, 2).map((url, i) => {
        const x = i === 0 ? 0 : half
        return `<image href="${url}" x="${x}" y="0" width="${half}" height="${size}" preserveAspectRatio="xMidYMid slice"/>`
      }).join('')
    } else {
      const cell = size / 2
      const positions = [
        { x: 0, y: 0 },
        { x: cell, y: 0 },
        { x: 0, y: cell },
        { x: cell, y: cell },
      ]
      images = dataUris.slice(0, 4).map((url, i) => {
        const pos = positions[i]
        return `<image href="${url}" x="${pos.x}" y="${pos.y}" width="${cell}" height="${cell}" preserveAspectRatio="xMidYMid slice"/>`
      }).join('')
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n  <defs>\n    <clipPath id="clip">\n      <rect x="0" y="0" width="${size}" height="${size}" rx="24" ry="24"/>\n    </clipPath>\n  </defs>\n  <g clip-path="url(#clip)">\n    ${images}\n  </g>\n</svg>`
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    return dataUri
  }

  async markRead(convId: number, userId: number) {
    await this.ensureParticipant(convId, userId)
    try { await (this.redis as any).hdel(`unread:user:${userId}`, String(convId)) } catch {}
  }
}