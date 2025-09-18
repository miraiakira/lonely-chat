import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

function getInitialToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const remember = localStorage.getItem('rememberMe') === 'true';
    if (remember) {
      return localStorage.getItem('auth_access_token');
    }
    return sessionStorage.getItem('auth_access_token');
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: getInitialToken(),
  setToken: (token) => {
    set({ token });
    if (typeof window !== 'undefined') {
      try {
        if (token == null) {
          localStorage.removeItem('auth_access_token');
          sessionStorage.removeItem('auth_access_token');
        } else {
          const remember = localStorage.getItem('rememberMe') === 'true';
          if (remember) {
            localStorage.setItem('auth_access_token', token);
            sessionStorage.removeItem('auth_access_token');
          } else {
            sessionStorage.setItem('auth_access_token', token);
            localStorage.removeItem('auth_access_token');
          }
        }
      } catch {}
    }
  },
  logout: () => {
    set({ token: null });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_access_token');
        sessionStorage.removeItem('auth_access_token');
      } catch {}
    }
  },
}));