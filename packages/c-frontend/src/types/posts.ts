// Unified Post-related types for c-frontend
// Avoid using any in components by importing these types

export interface Post {
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
  isHidden?: boolean
}

export interface PostListResponse {
  total: number
  items: Post[]
}

export interface CreatePostData {
  content?: string
  images?: string[]
}