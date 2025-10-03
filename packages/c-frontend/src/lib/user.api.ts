import { apiClient } from './apiClient'

export interface UserProfile {
  nickname?: string
  avatar?: string
  gender?: string
  bio?: string
}

export interface UpdateUserProfileData {
  nickname?: string
  avatar?: string
  gender?: string
  bio?: string
}

// 角色与权限类型（与后端保持最小一致，避免过度耦合）
export interface Role {
  id?: number
  name: string
  permissions?: Array<{ id?: number; name: string } | string>
}

export interface User {
  id: number
  username: string
  profile?: UserProfile
  // 后端 /auth/me 返回包含 roles（为字符串或对象），用于前端权限判定
  roles?: Array<Role | string>
}

export async function updateUserProfile(data: UpdateUserProfileData): Promise<User> {
  const res = await apiClient.put('/user/profile', data)
  return res.data
}

export async function getUserProfile(): Promise<User> {
  const res = await apiClient.get('/auth/me')
  return res.data
}