"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchMe, loginApp, refreshAccessToken, setAccessToken, logoutApp } from "@/lib/apiClient"
import type { User } from "@/lib/user.api"
import { isAxiosError } from "axios"
import { disconnectSocket } from "@/lib/realtime"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { useUserStore } from "@/store/user"

export type AuthUser = User | null

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isUser(value: unknown): value is User {
  if (!isPlainObject(value)) return false
  const id = value.id as unknown
  const username = value.username as unknown
  return typeof id === "number" && typeof username === "string"
}

function pickUser(data: unknown): User | null {
  if (isUser(data)) return data
  if (isPlainObject(data)) {
    const maybe = (data.user as unknown)
    if (isUser(maybe)) return maybe
  }
  return null
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { disconnect } = useWallet()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 确保 access_token 可用
      await refreshAccessToken()
      const data = (await fetchMe()) as unknown
      const u = pickUser(data)
      setUser(u)
      try { useUserStore.getState().setUser(u) } catch {}
    } catch (e) {
      if (isAxiosError(e)) {
        if (e.response?.status !== 401) {
          setError(e.message || "网络错误")
        }
      } else {
        const msg = e instanceof Error ? e.message : "网络错误"
        setError(msg)
      }
      setUser(null)
      try { useUserStore.getState().clearUser() } catch {}
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string, remember?: boolean) => {
    setError(null)
    const r = await loginApp({ username, password, remember })
    const data = await fetchMe().catch(() => null) as unknown
    const u = pickUser(data)
    setUser(u)
    try { useUserStore.getState().setUser(u) } catch {}
    return r
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApp()
    } finally {
      // 关闭 WS、断开钱包、清理前端令牌与用户态，并跳转登录页
      try { disconnectSocket() } catch {}
      try { await disconnect() } catch {}
      setAccessToken(null)
      setUser(null)
      try { useUserStore.getState().clearUser() } catch {}
      try { router.replace("/auth/login") } catch {}
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { user, loading, error, refresh, setUser, login, logout }
}