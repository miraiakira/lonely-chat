import { apiClient } from './apiClient'

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
  return res.data as { total: number, items: Array<{ id: string, postId: string, authorId: string, authorName?: string, authorAvatar?: string | null, content: string, createdAt: number }> }
}

export async function addComment(id: string, content: string) {
  const res = await apiClient.post(`/posts/${id}/comments`, { content })
  return res.data
}