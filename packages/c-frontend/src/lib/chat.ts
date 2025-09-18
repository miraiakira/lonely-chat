export type Conversation = {
  id: string
  name: string
  last: string
  unread: number
}

export type Message = {
  id: string
  convId: string
  senderId: string
  content: string
  images?: string[] | null
  timestamp: number
}

export type Friend = {
  id: string
  name: string
}

export type FriendRequest = {
  id: string
  from: Friend
  to: Friend
}

// In-memory mock state
let conversations: Conversation[] = [
  { id: "c1", name: "Alice", last: "明天见", unread: 2 },
  { id: "c2", name: "Bob", last: "发个文件", unread: 0 },
  { id: "c3", name: "群：周末活动", last: "报名统计", unread: 5 },
]

let messagesByConv: Record<string, Message[]> = {
  c1: [
    { id: "m1", convId: "c1", senderId: "u_alice", content: "嗨~", timestamp: Date.now() - 3600_000 },
    { id: "m2", convId: "c1", senderId: "me", content: "明天见", timestamp: Date.now() - 3500_000 },
  ],
  c2: [
    { id: "m3", convId: "c2", senderId: "u_bob", content: "发个文件", timestamp: Date.now() - 4000_000 },
  ],
  c3: [
    { id: "m4", convId: "c3", senderId: "u_carol", content: "周末活动报名啦", timestamp: Date.now() - 7200_000 },
  ],
}

let friends: Friend[] = [
  { id: "u_alice", name: "Alice" },
  { id: "u_bob", name: "Bob" },
  { id: "u_carol", name: "Carol" },
]

let allUsers: Friend[] = [
  ...friends,
  { id: "u_dave", name: "Dave" },
  { id: "u_eve", name: "Eve" },
]

let inboundRequests: FriendRequest[] = [
  { id: "r1", from: { id: "u_dave", name: "Dave" }, to: { id: "me", name: "Me" } },
]

export function getConversations(): Conversation[] {
  return conversations
}

export function getMessages(convId: string): Message[] {
  return messagesByConv[convId] || []
}

export function sendMessage(convId: string, content: string, senderId: string): Message {
  const msg: Message = {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    convId,
    senderId,
    content,
    timestamp: Date.now(),
  }
  messagesByConv[convId] = [...(messagesByConv[convId] || []), msg]
  const conv = conversations.find(c => c.id === convId)
  if (conv) conv.last = content
  return msg
}

export function getFriends(): Friend[] {
  return friends
}

export function searchUsers(q: string): Friend[] {
  const query = (q || "").toLowerCase().trim()
  if (!query) return []
  return allUsers.filter(u => u.name.toLowerCase().includes(query) || u.id.toLowerCase().includes(query))
}

export function requestFriend(userId: string) {
  const from = { id: "me", name: "Me" }
  const to = allUsers.find(u => u.id === userId) || { id: userId, name: userId }
  // For mock, we push to inbound as if we received from others; real app would push to outbound
  inboundRequests.push({ id: `r_${Math.random().toString(36).slice(2, 8)}`, from, to })
}

export function getFriendRequestsInbound(): FriendRequest[] {
  return inboundRequests
}

export function acceptFriendRequest(reqId: string) {
  const idx = inboundRequests.findIndex(r => r.id === reqId)
  if (idx >= 0) {
    const r = inboundRequests[idx]
    // Add friend
    const f = r.from.id === "me" ? r.to : r.from
    if (!friends.find(x => x.id === f.id)) friends.push(f)
    inboundRequests.splice(idx, 1)
  }
}

export function declineFriendRequest(reqId: string) {
  const idx = inboundRequests.findIndex(r => r.id === reqId)
  if (idx >= 0) inboundRequests.splice(idx, 1)
}