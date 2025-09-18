import { apiClient } from './apiClient'

export type Conversation = {
  id: string
  name: string
  last: string
  unread: number
  avatar?: string | null
}

export type Message = {
  id: string
  convId: string
  senderId: string
  content: string
  images?: string[] | null
  timestamp: number
  senderName?: string
  senderAvatar?: string | null
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await apiClient.get('/chat/conversations')
  return res.data
}

export async function getMessages(convId: string): Promise<Message[]> {
  const res = await apiClient.get(`/chat/conversations/${convId}/messages`)
  return res.data
}

export async function sendMessage(params: { convId?: string; toUserId?: string; content?: string; images?: string[] }): Promise<Message> {
  const res = await apiClient.post('/chat/send', {
    convId: params.convId ? Number(params.convId) : undefined,
    toUserId: params.toUserId ? Number(params.toUserId) : undefined,
    content: params.content,
    images: params.images,
  })
  return res.data
}

export async function createGroup(params: { title?: string; participantIds: string[] }): Promise<{ id: string; name: string; avatar?: string | null }> {
  const res = await apiClient.post('/chat/group', {
    title: params.title,
    participantIds: (params.participantIds || []).map((s) => Number(s)),
  })
  return res.data
}

export async function markRead(convId: string): Promise<void> {
  await apiClient.post(`/chat/conversations/${convId}/read`)
}

// 新增：获取（或创建并加入）公共群聊会话
export async function getPublicConversation(): Promise<{ id: string; name: string; avatar?: string | null }> {
  const res = await apiClient.get('/chat/public')
  return res.data
}