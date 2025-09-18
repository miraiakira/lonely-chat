import axios from "axios"

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

export function getAccessToken() {
  return accessToken
}

// Auto refresh token on 401 and retry once
apiClient.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const { response, config } = error || {}
    const original: any = config || {}
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