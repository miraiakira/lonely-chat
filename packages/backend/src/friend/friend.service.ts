import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, In } from 'typeorm'
import { FriendRequest } from './friend-request.entity'
import { FriendRelation } from './friend.entity'
import { User } from '../user/user.entity'

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(FriendRequest) private readonly reqRepo: Repository<FriendRequest>,
    @InjectRepository(FriendRelation) private readonly relRepo: Repository<FriendRelation>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private orderPair(a: number, b: number) {
    return a < b ? [a, b] as const : [b, a] as const
  }

  async request(fromUserId: number, toUserId: number) {
    if (fromUserId === toUserId) throw new BadRequestException('不能添加自己为好友')
    const from = await this.userRepo.findOne({ where: { id: fromUserId } })
    const to = await this.userRepo.findOne({ where: { id: toUserId } })
    if (!from || !to) throw new NotFoundException('用户不存在')

    // 已是好友直接返回
    const [a, b] = this.orderPair(fromUserId, toUserId)
    const existedRel = await this.relRepo.findOne({ where: { userA: { id: a }, userB: { id: b } } as any })
    if (existedRel) return { ok: true, alreadyFriend: true }

    // 处理已有申请
    const existedReq = await this.reqRepo.findOne({ where: [
      { fromUser: { id: fromUserId }, toUser: { id: toUserId }, status: 'pending' } as any,
      { fromUser: { id: toUserId }, toUser: { id: fromUserId }, status: 'pending' } as any,
    ] })
    if (existedReq) return { ok: true, requestId: existedReq.id }

    const req = this.reqRepo.create({ fromUser: from, toUser: to, status: 'pending' })
    await this.reqRepo.save(req)
    return { ok: true, requestId: req.id }
  }

  async listFriends(userId: number) {
    // 显式加载 userA/userB 以及各自的 profile，确保返回 avatar 可用
    const rels = await this.relRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.userA', 'a')
      .leftJoinAndSelect('a.profile', 'ap')
      .leftJoinAndSelect('r.userB', 'b')
      .leftJoinAndSelect('b.profile', 'bp')
      .where('a.id = :uid OR b.id = :uid', { uid: userId })
      .orderBy('r.createdAt', 'DESC')
      .getMany()

    return rels.map(r => {
      const friend = r.userA.id === userId ? r.userB : r.userA
      return { id: friend.id, username: friend.username, profile: friend.profile }
    })
  }

  async listRequests(userId: number, direction: 'in' | 'out' | 'all' = 'in') {
    const where = direction === 'in'
      ? { toUser: { id: userId }, status: 'pending' } as any
      : direction === 'out'
      ? { fromUser: { id: userId }, status: 'pending' } as any
      : [{ toUser: { id: userId }, status: 'pending' } as any, { fromUser: { id: userId }, status: 'pending' } as any]
    const list = await this.reqRepo.find({ where })
    return list
  }

  async accept(userId: number, reqId: number) {
    const req = await this.reqRepo.findOne({ where: { id: reqId } })
    if (!req) throw new NotFoundException('请求不存在')
    if (req.toUser.id !== userId) throw new ForbiddenException('无权处理该请求')
    if (req.status !== 'pending') throw new BadRequestException('请求状态不可处理')

    const [a, b] = this.orderPair(req.fromUser.id, req.toUser.id)
    const existedRel = await this.relRepo.findOne({ where: { userA: { id: a }, userB: { id: b } } as any })
    if (!existedRel) {
      const rel = this.relRepo.create({ userA: { id: a } as any, userB: { id: b } as any })
      await this.relRepo.save(rel)
    }

    req.status = 'accepted'
    await this.reqRepo.save(req)
    return { ok: true }
  }

  async decline(userId: number, reqId: number) {
    const req = await this.reqRepo.findOne({ where: { id: reqId } })
    if (!req) throw new NotFoundException('请求不存在')
    if (req.toUser.id !== userId) throw new ForbiddenException('无权处理该请求')
    if (req.status !== 'pending') throw new BadRequestException('请求状态不可处理')

    req.status = 'declined'
    await this.reqRepo.save(req)
    return { ok: true }
  }

  // NEW: 删除好友关系（双向）
  async remove(userId: number, otherUserId: number) {
    const [a, b] = this.orderPair(userId, otherUserId)
    const rel = await this.relRepo.findOne({ where: { userA: { id: a }, userB: { id: b } } as any })
    if (!rel) {
      // 不存在也视为成功，幂等
      return { ok: true, notFriend: true }
    }
    // 确保当前用户参与该关系
    if (rel.userA.id !== userId && rel.userB.id !== userId) {
      throw new ForbiddenException('无权删除该好友关系')
    }
    await this.relRepo.remove(rel)
    return { ok: true }
  }
}