"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchMe, loginApp, refreshAccessToken, setAccessToken } from "@/lib/apiClient"

export type AuthUser = Record<string, any> | null

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 确保 access_token 可用
      await refreshAccessToken()
      const data = await fetchMe()
      const u = (data && (data.user ?? data)) || null
      setUser(u)
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        setError(e?.message || "网络错误")
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string, remember?: boolean) => {
    setError(null)
    const r = await loginApp({ username, password, remember })
    const data = await fetchMe().catch(() => null)
    const u = (data && (data.user ?? data)) || null
    setUser(u)
    return r
  }, [])

  const logout = useCallback(async () => {
    setAccessToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { user, loading, error, refresh, setUser, login, logout }
}