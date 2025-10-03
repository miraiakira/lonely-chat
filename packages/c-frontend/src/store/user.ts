"use client"

import { create } from "zustand"
import type { User } from "@/lib/user.api"

interface UserState {
  user: User | null
  setUser: (u: User | null) => void
  clearUser: () => void
  updateProfile: (partial: Partial<User["profile"]>) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  clearUser: () => set({ user: null }),
  updateProfile: (partial) =>
    set((state) => {
      const curr = state.user
      if (!curr) return { user: null }
      return { user: { ...curr, profile: { ...curr.profile, ...partial } } }
    }),
}))