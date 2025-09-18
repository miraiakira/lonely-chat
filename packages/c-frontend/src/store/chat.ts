import { create } from "zustand"
import type { Conversation, Message } from "@/lib/chat.api"
import { getConversations as apiGetConversations, getMessages as apiGetMessages, sendMessage as apiSendMessage, markRead as apiMarkRead } from "@/lib/chat.api"
import { apiClient } from "@/lib/apiClient"

// 占位：好友/发现功能尚未接入后端，先保留空列表与空操作，避免打断UI
interface Friend { id: string; name: string; avatar?: string }
interface FriendRequest { id: string; from: Friend; to: Friend }

interface ChatState {
  // conversations
  q: string
  convs: Conversation[]
  activeId: string | null

  // messages
  messages: Message[]
  draft: string

  // friends and discover (暂为占位)
  peopleQ: string
  friends: Friend[]
  found: Friend[]
  inboundReqs: FriendRequest[]

  // actions
  init: () => Promise<void>
  setQ: (q: string) => void
  setPeopleQ: (q: string) => void
  setActive: (id: string) => Promise<void>
  setDraft: (t: string) => void
  send: (userId: string) => Promise<Message | null>
  searchPeople: () => Promise<void>
  addFriend: (id: string) => Promise<void>
  accept: (reqId: string) => Promise<void>
  decline: (reqId: string) => Promise<void>
  removeFriend: (id: string) => Promise<void>
  refreshLists: () => Promise<void>
  receive: (msg: Message) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  q: "",
  convs: [],
  activeId: null,
  messages: [],
  draft: "",
  peopleQ: "",
  friends: [],
  found: [],
  inboundReqs: [],

  init: async () => {
    try {
      const [cs, friendsRaw, inboundRaw] = await Promise.all([
        apiGetConversations(),
        apiClient.get('/friend/list').then(r => r.data).catch(() => []),
        apiClient.get('/friend/requests', { params: { direction: 'in' } }).then(r => r.data).catch(() => []),
      ])
      const friendsMapped = Array.isArray(friendsRaw) ? friendsRaw.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar })) : []
      const inboundReqs = Array.isArray(inboundRaw) ? inboundRaw.map((it: any) => ({ id: String(it.id), from: { id: String(it.fromUser?.id), name: it.fromUser?.profile?.nickname || it.fromUser?.username, avatar: it.fromUser?.profile?.avatar }, to: { id: String(it.toUser?.id), name: it.toUser?.profile?.nickname || it.toUser?.username, avatar: it.toUser?.profile?.avatar } })) : []

      const activeId = cs[0]?.id || null
      set({ convs: cs, activeId, friends: friendsMapped, inboundReqs })

      if (activeId) {
        try {
          const ms = await apiGetMessages(activeId)
          set({ messages: ms })
          // 进入会话即标记已读
          void apiMarkRead(activeId).catch(() => {})
          // 本地清零未读
          set(({ convs }) => ({ convs: convs.map(c => c.id === activeId ? { ...c, unread: 0 } : c) }))
        } catch (e: any) {
          if (e?.response?.status === 401) {
            set({ messages: [] })
          } else {
            console.warn('[chat.init] getMessages failed:', e?.message || e)
            set({ messages: [] })
          }
        }
      } else {
        set({ messages: [] })
      }
    } catch (e: any) {
      if (e?.response?.status === 401) {
        set({ convs: [], activeId: null, messages: [], friends: [], inboundReqs: [] })
      } else {
        console.warn('[chat.init] failed:', e?.message || e)
        set({ convs: [], activeId: null, messages: [], friends: [], inboundReqs: [] })
      }
    }
  },

  setQ: (q) => set({ q }),
  setPeopleQ: (peopleQ) => set({ peopleQ }),
  setActive: async (id) => {
    // 支持从好友列表直接发起会话：activeId 形如 "direct:<userId>" 时，不请求历史记录，等首次发送后切换到真实会话
    if (id.startsWith('direct:')) {
      set({ activeId: id, messages: [] })
      return
    }
    try {
      const ms = await apiGetMessages(id)
      set({ activeId: id, messages: ms })
      // 标记已读并清零
      void apiMarkRead(id).catch(() => {})
      set(({ convs }) => ({ convs: convs.map(c => c.id === id ? { ...c, unread: 0 } : c) }))
    } catch (e: any) {
      if (e?.response?.status === 401) {
        set({ activeId: id, messages: [] })
      } else {
        console.warn('[chat.setActive] getMessages failed:', e?.message || e)
        set({ activeId: id, messages: [] })
      }
    }
  },
  setDraft: (draft) => set({ draft }),

  send: async (_userId) => {
    const { activeId, draft, messages } = get()
    if (!activeId) return null
    const content = draft.trim()
    if (!content) return null
    try {
      // 如果是从好友列表临时发起（direct:<userId>），则使用 toUserId 发送，后端会创建/找到直聊会话
      if (activeId.startsWith('direct:')) {
        const toUserId = activeId.split(':')[1]
        const msg = await apiSendMessage({ toUserId, content })
        // 切换到真实会话并刷新列表
        set({ draft: '', activeId: msg.convId, messages: [...messages, msg] })
        void get().refreshLists()
        return msg
      }
      // 常规：在已有会话里发送
      const msg = await apiSendMessage({ convId: activeId, content })
      set({ draft: '', messages: [...messages, msg] })
      return msg
    } catch (e: any) {
      if (e?.response?.status === 401) {
        console.warn('[chat.send] unauthorized')
      } else {
        console.warn('[chat.send] failed:', e?.message || e)
      }
      return null
    }
  },

  // 接入后端用户搜索接口（带头像）
  searchPeople: async () => {
    const { peopleQ } = get()
    const q = (peopleQ || '').trim()
    if (!q) { set({ found: [] }); return }
    try {
      const res = await apiClient.get('/user/search', { params: { q, limit: 20 } })
      const users = Array.isArray(res.data) ? res.data : []
      const found: Friend[] = users.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar }))
      set({ found })
    } catch (e: any) {
      if (e?.response?.status === 401) {
        set({ found: [] })
      } else {
        console.warn('[chat.searchPeople] failed:', e?.message || e)
        set({ found: [] })
      }
    }
  },
  addFriend: async (id: string) => {
    try {
      await apiClient.post('/friend/request', { toUserId: Number(id) })
      // 发送后刷新收到的申请（对方收到，我们本端应在“发出的申请”里；此处先刷新入站+出站一起）
      const [inbound, outbound, friends] = await Promise.all([
        apiClient.get('/friend/requests', { params: { direction: 'in' } }).then(r => r.data),
        apiClient.get('/friend/requests', { params: { direction: 'out' } }).then(r => r.data),
        apiClient.get('/friend/list').then(r => r.data),
      ])
      const inboundReqs = Array.isArray(inbound) ? inbound.map((it: any) => ({ id: String(it.id), from: { id: String(it.fromUser?.id), name: it.fromUser?.profile?.nickname || it.fromUser?.username, avatar: it.fromUser?.profile?.avatar }, to: { id: String(it.toUser?.id), name: it.toUser?.profile?.nickname || it.toUser?.username, avatar: it.toUser?.profile?.avatar } })) : []
      const friendsMapped = Array.isArray(friends) ? friends.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar })) : []
      set({ inboundReqs: inboundReqs, friends: friendsMapped })
    } catch (e: any) {
      if (e?.response?.status === 401) return
      console.warn('[chat.addFriend] failed:', e?.message || e)
    }
  },
  accept: async (reqId: string) => {
    try {
      await apiClient.post(`/friend/accept/${reqId}`)
      const [inbound, friends] = await Promise.all([
        apiClient.get('/friend/requests', { params: { direction: 'in' } }).then(r => r.data),
        apiClient.get('/friend/list').then(r => r.data),
      ])
      const inboundReqs = Array.isArray(inbound) ? inbound.map((it: any) => ({ id: String(it.id), from: { id: String(it.fromUser?.id), name: it.fromUser?.profile?.nickname || it.fromUser?.username, avatar: it.fromUser?.profile?.avatar }, to: { id: String(it.toUser?.id), name: it.toUser?.profile?.nickname || it.toUser?.username, avatar: it.toUser?.profile?.avatar } })) : []
      const friendsMapped = Array.isArray(friends) ? friends.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar })) : []
      set({ inboundReqs, friends: friendsMapped })
    } catch (e: any) {
      if (e?.response?.status === 401) return
      console.warn('[chat.accept] failed:', e?.message || e)
    }
  },
  decline: async (reqId: string) => {
    try {
      await apiClient.post(`/friend/decline/${reqId}`)
      const inbound = await apiClient.get('/friend/requests', { params: { direction: 'in' } }).then(r => r.data)
      const inboundReqs = Array.isArray(inbound) ? inbound.map((it: any) => ({ id: String(it.id), from: { id: String(it.fromUser?.id), name: it.fromUser?.profile?.nickname || it.fromUser?.username, avatar: it.fromUser?.profile?.avatar }, to: { id: String(it.toUser?.id), name: it.toUser?.profile?.nickname || it.toUser?.username, avatar: it.toUser?.profile?.avatar } })) : []
      set({ inboundReqs })
    } catch (e: any) {
      if (e?.response?.status === 401) return
      console.warn('[chat.decline] failed:', e?.message || e)
    }
  },
  removeFriend: async (id: string) => {
    try {
      await apiClient.delete(`/friend/${Number(id)}`)
      const friends = await apiClient.get('/friend/list').then(r => r.data)
      const friendsMapped = Array.isArray(friends) ? friends.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar })) : []
      set({ friends: friendsMapped })
    } catch (e: any) {
      if (e?.response?.status === 401) return
      console.warn('[chat.removeFriend] failed:', e?.message || e)
    }
  },
  refreshLists: async () => {
    try {
      const [convs, friends, inbound] = await Promise.all([
        apiGetConversations(),
        apiClient.get('/friend/list').then(r => r.data),
        apiClient.get('/friend/requests', { params: { direction: 'in' } }).then(r => r.data),
      ])
      const friendsMapped = Array.isArray(friends) ? friends.map((u: any) => ({ id: String(u.id), name: u?.profile?.nickname || u?.username || String(u.id), avatar: u?.profile?.avatar })) : []
      const inboundReqs = Array.isArray(inbound) ? inbound.map((it: any) => ({ id: String(it.id), from: { id: String(it.fromUser?.id), name: it.fromUser?.profile?.nickname || it.fromUser?.username, avatar: it.fromUser?.profile?.avatar }, to: { id: String(it.toUser?.id), name: it.toUser?.profile?.nickname || it.toUser?.username, avatar: it.toUser?.profile?.avatar } })) : []
      set({ convs, friends: friendsMapped, inboundReqs })
    } catch (e: any) {
      if (e?.response?.status === 401) {
        set({ convs: [], friends: [], inboundReqs: [] })
      } else {
        console.warn('[chat.refreshLists] failed:', e?.message || e)
        set({ convs: [], friends: [], inboundReqs: [] })
      }
    }
  },
  receive: (msg) => {
    const { activeId, messages, convs } = get()

    // 如果当前处于临时直聊（direct:<userId>）并且正好是该用户发来的消息，
    // 则切换到真实会话并立刻展示消息
    if (activeId && activeId.startsWith('direct:')) {
      const uid = activeId.split(':')[1]
      if (uid && uid === msg.senderId) {
        set({ activeId: msg.convId, messages: [...messages, msg] })
        // 同步刷新会话列表，确保新会话出现并置顶
        void get().refreshLists()
        return
      }
    }

    // 更新当前对话消息
    if (activeId === msg.convId) {
      set({ messages: [...messages, msg] })
    }

    // 更新会话列表的 last 与 unread
    const idx = convs.findIndex(c => c.id === msg.convId)
    if (idx >= 0) {
      const next = convs.slice()
      const meId = String((useChatStore as any).getState().activeId)
      // unread：若当前非该会话，则 +1
      const unreadInc = activeId === msg.convId ? 0 : 1
      next[idx] = { ...next[idx], last: msg.content || ((msg.images && msg.images.length > 0) ? '[图片]' : ''), unread: (next[idx].unread || 0) + unreadInc }
      // 移动到顶部
      const [item] = next.splice(idx, 1)
      next.unshift(item)
      set({ convs: next })
    } else {
      // 不在列表中（例如直聊首次出现），刷新一次列表
      void get().refreshLists()
    }
  },
}))