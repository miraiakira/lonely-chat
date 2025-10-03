import { apiClient } from './apiClient'
import type { Post, PostListResponse, CreatePostData } from '@/types/posts'

export type { Post, PostListResponse, CreatePostData } from '@/types/posts'

export async function getPosts(params?: { limit?: number; offset?: number }) {
  const res = await apiClient.get('/posts', { params })
  return res.data as PostListResponse
}

export async function createPost(data: CreatePostData) {
  const res = await apiClient.post('/posts', data)
  return res.data as Post
}