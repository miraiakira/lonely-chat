import { apiClient } from './apiClient'

export type RewardsSummary = {
  todayChecked: boolean
  streak: number
  totalPoints: number
  todayPoints: number
  claimableAmount?: number
}

export type CheckinResult = {
  todayChecked: boolean
  streak: number
  totalPoints: number
  todayPoints: number
}

export async function getRewardsSummary(): Promise<RewardsSummary> {
  const res = await apiClient.get('/rewards/summary')
  return res.data as RewardsSummary
}

export async function checkin(): Promise<CheckinResult> {
  const res = await apiClient.post('/rewards/checkin')
  return res.data as CheckinResult
}

// 预留：积分兑换代币的接口（非托管模式领取）
export async function claimTokens(params: { chain?: 'solana'; wallet?: string; tx?: string }): Promise<{ status: 'queued' | 'done'; tx?: string }> {
  const res = await apiClient.post('/rewards/claim', params)
  return res.data as { status: 'queued' | 'done'; tx?: string }
}