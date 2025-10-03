import axios, { AxiosRequestConfig } from "axios"

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

let accessToken: string | null = null
export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common["Authorization"]
  }
}

export async function refreshAccessToken() {
  try {
    const res = await apiClient.post("/auth/refresh")
    const token = res.data?.access_token || null
    setAccessToken(token)
    return token
  } catch (e) {
    setAccessToken(null)
    return null
  }
}

export async function fetchMe() {
  const res = await apiClient.get("/auth/me")
  return res.data
}

export async function loginApp(data: { username: string; password: string; remember?: boolean }) {
  const res = await apiClient.post("/auth/login", data)
  const token = res.data?.access_token || null
  setAccessToken(token)
  return res.data
}

// 注销：调用后端清除刷新令牌 Cookie，并移除前端 access_token
export async function logoutApp(): Promise<{ success?: boolean } | null> {
  try {
    const res = await apiClient.post("/auth/logout")
    setAccessToken(null)
    return res.data || { success: true }
  } catch (e) {
    // 即使后端失败，也确保前端清理 token，避免自动刷新重新登录
    setAccessToken(null)
    return null
  }
}

export function getAccessToken() {
  return accessToken
}

// Auto refresh token on 401 and retry once
apiClient.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const { response, config } = error || {}
    const original: AxiosRequestConfig & { _retry?: boolean } = config || {}
    if (!response) return Promise.reject(error)
    const status = response.status
    // Avoid recursion for refresh endpoint itself
    const isRefreshCall = (original?.url || "").includes("/auth/refresh")
    if (status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true
      try {
        const newToken = await refreshAccessToken()
        if (newToken) {
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${newToken}`,
          }
          return apiClient.request(original)
        }
      } catch {}
    }
    return Promise.reject(error)
  }
)