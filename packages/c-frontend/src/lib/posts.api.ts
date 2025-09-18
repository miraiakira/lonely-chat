import { apiClient } from './apiClient'

export type Post = {
  id: string
  authorId: string
  authorName?: string
  authorAvatar?: string | null
  content: string
  images?: string[] | null
  createdAt: number
  likeCount?: number
  likedByMe?: boolean
  commentCount?: number
}

export async function getPosts(params?: { limit?: number; offset?: number }) {
  const res = await apiClient.get('/posts', { params })
  return res.data as { total: number; items: Post[] }
}

export async function createPost(data: { content?: string; images?: string[] }) {
  const res = await apiClient.post('/posts', data)
  return res.data as Post
}