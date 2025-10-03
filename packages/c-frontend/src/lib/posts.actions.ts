import { apiClient } from './apiClient'
import { Comment } from '@/types/common'

export async function likePost(id: string) {
  const res = await apiClient.post(`/posts/${id}/like`)
  return res.data
}

export async function unlikePost(id: string) {
  const res = await apiClient.post(`/posts/${id}/unlike`)
  return res.data
}

export async function deletePost(id: string) {
  const res = await apiClient.delete(`/posts/${id}`)
  return res.data
}

export async function listComments(id: string, { limit = 50, offset = 0 } = {}) {
  const res = await apiClient.get(`/posts/${id}/comments`, { params: { limit, offset } })
  return res.data as { total: number, items: Array<{ id: string, postId: string, authorId: string, authorName?: string, authorAvatar?: string | null, content: string, createdAt: number, parentCommentId?: string, parentAuthorId?: string, parentAuthorName?: string }> }
}

export async function addComment(id: string, content: string, parentCommentId?: string | number) {
  const payload: { content: string; parentCommentId?: number } = { content }
  // 后端要求整数且 >= 1，这里做健壮性转换与校验
  if (parentCommentId !== undefined && parentCommentId !== null) {
    let pid: number | null = null
    if (typeof parentCommentId === 'number' && Number.isInteger(parentCommentId)) {
      pid = parentCommentId
    } else if (typeof parentCommentId === 'string') {
      const trimmed = parentCommentId.trim()
      if (/^\d+$/.test(trimmed)) {
        pid = parseInt(trimmed, 10)
      }
    }
    if (typeof pid === 'number' && pid >= 1) {
      payload.parentCommentId = pid
    }
  }
  const res = await apiClient.post(`/posts/${id}/comments`, payload)
  return res.data
}