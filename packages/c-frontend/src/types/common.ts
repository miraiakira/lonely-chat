// API 错误响应类型
export interface ApiErrorResponse {
  response?: {
    status?: number
    data?: {
      message?: string | string[]
    }
  }
  message?: string
}

// 扩展 ApiError 以包含响应信息
export interface ApiError extends Error {
  response?: {
    status?: number
    data?: {
      message?: string | string[]
    }
  }
  code?: string | number
  details?: unknown
}

// 网络错误类型
export interface NetworkError extends Error {
  code?: string
  status?: number
}

// 表单验证错误类型
export interface ValidationError {
  field: string
  message: string
}

// API响应基础类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page?: number
  limit?: number
  hasMore?: boolean
}

// 用户相关类型
export interface User {
  id: string | number
  username: string
  email?: string
  avatar?: string | null
  profile?: {
    nickname?: string
    avatar?: string | null
  }
  roles?: Array<string | { name: string }>
}

// 帖子相关类型
export interface Post {
  id: string | number
  content: string
  authorId: string
  author?: User
  createdAt: string
  updatedAt?: string
  likes?: number
  isLiked?: boolean
}

// 评论类型
export interface Comment {
  id: string
  postId: string
  authorId: string
  authorName?: string
  authorAvatar?: string | null
  content: string
  createdAt: number
  parentCommentId?: string
  parentAuthorId?: string
  parentAuthorName?: string
}

// 聊天相关类型
export interface Friend {
  id: string
  name: string
  avatar?: string | null
}

export interface FriendRequest {
  id: string
  from: {
    id: string
    name: string
    avatar?: string | null
  }
  to: {
    id: string
    name: string
    avatar?: string | null
  }
}

// 搜索结果类型
export interface PostSearchItem {
  id: string | number
  content: string
  authorId: string
  author?: User
  createdAt: string
}

// 实时事件类型
export interface RealtimeEvent {
  type: string
  payload: unknown
  participants?: Array<string | number>
}

// 通用处理函数类型
export type ErrorHandler = (error: ApiError | NetworkError | Error) => void
export type SuccessHandler<T = unknown> = (data: T) => void