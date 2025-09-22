import { apiClient } from './apiClient'

export type PostSearchItem = {
  id: string
  content: string
  authorId: number
  authorUsername?: string
  images?: string[] | null
  likesCount?: number
  commentsCount?: number
  createdAt: number | string
  updatedAt?: number | string
  // highlight fields
  contentHighlight?: string
  authorUsernameHighlight?: string
}

export async function searchPosts(params: { q: string; limit?: number; offset?: number; engine?: 'auto' | 'es' | 'db' }) {
  const { q, limit = 20, offset = 0, engine } = params
  const res = await apiClient.get('/search/posts', { params: { q, limit, offset, engine } })
  return res.data as { total: number; from: number; items: PostSearchItem[] }
}