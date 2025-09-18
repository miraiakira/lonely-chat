import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useMenuStore } from '../store/menuStore';
import { useUserStore } from '../store/userStore';

const apiClient = axios.create({
  baseURL: 'http://localhost:3030/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
}

// Response: 401 -> try refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error?.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      try {
        isRefreshing = true;
        const res = await apiClient.post('/auth/refresh');
        const newToken = (res.data as any)?.access_token;
        if (newToken) {
          useAuthStore.getState().setToken(newToken);
          processQueue(null, newToken);
          (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
        throw error;
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        try {
          const { logout } = useAuthStore.getState();
          const { setMenus } = useMenuStore.getState();
          const { clearUser } = useUserStore.getState();
          logout();
          setMenus([]);
          clearUser();
        } finally {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;