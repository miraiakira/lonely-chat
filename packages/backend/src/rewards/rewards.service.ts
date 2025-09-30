import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserReward } from './entities/user-reward.entity'
import { UserCheckin } from './entities/user-checkin.entity'
import { RewardsConfig } from './rewards.config'
import * as web3 from '@solana/web3.js'
import * as nacl from 'tweetnacl'

function utcDayString(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function utcYesterdayString(date = new Date()): string {
  const dt = new Date(date.getTime())
  dt.setUTCDate(dt.getUTCDate() - 1)
  return utcDayString(dt)
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name)

  constructor(
    @InjectRepository(UserReward) private readonly rewardRepo: Repository<UserReward>,
    @InjectRepository(UserCheckin) private readonly checkinRepo: Repository<UserCheckin>,
    private readonly cfg: RewardsConfig,
  ) {}

  async getSummary(userId: number): Promise<{ todayChecked: boolean; streak: number; totalPoints: number; claimableAmount?: number }> {
    const today = utcDayString()
    const todayCheckin = await this.checkinRepo.findOne({ where: { user: { id: userId }, checkinDate: today } })
    let reward = await this.rewardRepo.findOne({ where: { user: { id: userId } } })
    if (!reward) {
      reward = this.rewardRepo.create({ user: { id: userId } as any, totalPoints: 0, streak: 0, lastCheckinDate: null })
      reward = await this.rewardRepo.save(reward)
    }
    return {
      todayChecked: Boolean(todayCheckin),
      streak: reward.streak || 0,
      totalPoints: reward.totalPoints || 0,
      claimableAmount: reward.totalPoints || 0,
    }
  }

  async checkin(userId: number): Promise<{ todayChecked: boolean; streak: number; totalPoints: number; todayPoints?: number }> {
    const today = utcDayString()
    const exists = await this.checkinRepo.findOne({ where: { user: { id: userId }, checkinDate: today } })
    let reward = await this.rewardRepo.findOne({ where: { user: { id: userId } } })
    if (!reward) {
      reward = this.rewardRepo.create({ user: { id: userId } as any, totalPoints: 0, streak: 0, lastCheckinDate: null })
      reward = await this.rewardRepo.save(reward)
    }
    if (exists) {
      return { todayChecked: true, streak: reward.streak || 0, totalPoints: reward.totalPoints || 0 }
    }

    // 新增签到记录（幂等保证由唯一约束提供）
    await this.checkinRepo.save({ user: { id: userId } as any, checkinDate: today })

    const yesterday = utcYesterdayString()
    const continued = reward.lastCheckinDate === yesterday
    const newStreak = continued ? (reward.streak || 0) + 1 : 1

    const base = this.cfg.basePoints()
    let bonus = 0
    if (this.cfg.streakBonusEnabled()) {
      bonus = Math.min(Math.max(newStreak - 1, 0), this.cfg.streakBonusCap())
    }
    const todayPoints = base + bonus
    const newTotal = (reward.totalPoints || 0) + todayPoints

    reward.streak = newStreak
    reward.totalPoints = newTotal
    reward.lastCheckinDate = today
    await this.rewardRepo.save(reward)

    return { todayChecked: true, streak: newStreak, totalPoints: newTotal, todayPoints }
  }

  async claim(userId: number, params?: { chain?: 'solana'; wallet?: string, tx?: string }): Promise<{ status: 'queued' | 'done'; tx?: string }> {
    if (params?.chain !== 'solana') {
      throw new Error('only solana chain is supported')
    }
    if (!params.wallet || !params.tx) {
      throw new Error('wallet and tx are required for solana claim')
    }

    const reward = await this.rewardRepo.findOne({ where: { user: { id: userId } } })
    if (!reward || !reward.totalPoints || reward.totalPoints <= 0) {
      throw new Error('no claimable points')
    }

    const tx = web3.Transaction.from(Buffer.from(params.tx, 'base64'))

    const valid = this.verifySignature(tx, params.wallet)
    if (!valid) {
      throw new Error('invalid signature')
    }

    // TODO: 真实交易发送
    // const conn = new web3.Connection(web3.clusterApiUrl('devnet'))
    // const txid = await conn.sendRawTransaction(tx.serialize())
    const txid = `solana_tx_id_${Date.now()}` // mock
    this.logger.log(`[claim] user ${userId} claimed ${reward.totalPoints} points to ${params.wallet}, txid: ${txid}`)

    reward.totalPoints = 0
    await this.rewardRepo.save(reward)

    return { status: 'done', tx: txid }
  }

  private verifySignature(tx: web3.Transaction, expectedSigner: string): boolean {
    if (!tx.signatures.length) return false

    const sig = tx.signatures[0]
    const pubKey = new web3.PublicKey(expectedSigner)

    if (!sig.publicKey.equals(pubKey)) {
      this.logger.warn(`[claim] expected signer ${expectedSigner}, but got ${sig.publicKey.toBase58()}`)
      return false
    }

    const message = tx.compileMessage()
    const signature = sig.signature as Buffer

    return nacl.sign.detached.verify(message.serialize(), signature, pubKey.toBuffer())
  }
}