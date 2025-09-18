import type Redis from 'ioredis'
import type { Producer } from 'kafkajs'

export type ChatEventType = 'message' | 'group_created'

export interface MessageEventPayload {
  id: string
  convId: string
  senderId: string
  content: string
  images?: string[] | null
  timestamp: number
  senderName?: string
  senderAvatar?: string | null
}

export interface GroupCreatedPayload {
  id: string
  title?: string | null
  avatar?: string | null
  participants: string[]
}

export type ChatEvent =
  | { type: 'message'; recipients: string[]; payload: MessageEventPayload }
  | { type: 'group_created'; recipients: string[]; payload: GroupCreatedPayload }

export interface ChatEventPublisher {
  publish(event: ChatEvent): Promise<void>
}

export const CHAT_EVENT_PUBLISHER = 'CHAT_EVENT_PUBLISHER'