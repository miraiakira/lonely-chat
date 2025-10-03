import { io, Socket } from "socket.io-client"
import { getAccessToken } from "@/lib/apiClient"
import { RealtimeEvent } from "@/types/common"

let socket: Socket | null = null

const WS_ENABLED = process.env.NEXT_PUBLIC_WS_ENABLED === "true"

export function getSocket(): Socket | null {
  if (!WS_ENABLED) return null
  if (socket) return socket
  const url = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3030"
  socket = io(url, {
    transports: ["websocket"],
    withCredentials: true,
    auth: () => {
      const token = getAccessToken()
      return token ? { token } : {}
    },
  })
  return socket
}

export function initRealtimeLogging() {
  if (!WS_ENABLED) return
  const s = getSocket()
  if (!s) return
  s.on("connect", () => console.log("[ws] connected", s.id))
  s.on("disconnect", (reason) => console.log("[ws] disconnect", reason))
  s.on("connect_error", (err) => console.warn("[ws] disabled or unavailable:", err.message))
  s.on("welcome", (data) => console.log("[ws] welcome", data))
}

export function disconnectSocket() {
  const s = getSocket()
  if (!s) return
  try {
    s.disconnect()
  } catch {}
}

export function onGroupCreated(handler: (evt: { id: string; title?: string | null; avatar?: string | null; participants: string[] }) => void) {
  const s = getSocket()
  if (!s) return () => {}
  const fn = (payload: unknown) => {
    try {
      const evt = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
      if (!evt) return
      const id = String(evt.id)
      const title = typeof evt.title === 'string' ? evt.title : null
      const avatar = typeof evt.avatar === 'string' ? evt.avatar : null
      const participants = Array.isArray(evt.participants) ? evt.participants.map((x: unknown) => String(x)) : []
      handler({ id, title, avatar: avatar ?? undefined, participants })
    } catch {}
  }
  s.on('group_created', fn)
  return () => s.off('group_created', fn)
}