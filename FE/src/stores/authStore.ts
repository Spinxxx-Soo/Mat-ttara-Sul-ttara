import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  needsOnboarding: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserInfo) => void;
  setAuth: (access: string, refresh: string, isNewUser: boolean) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoggedIn: false,
      needsOnboarding: false,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isLoggedIn: true }),
      setUser: (user) => set({ user }),
      setAuth: (access, refresh, isNewUser) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          isLoggedIn: true,
          needsOnboarding: isNewUser,
        }),
      completeOnboarding: () => set({ needsOnboarding: false }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isLoggedIn: false,
          needsOnboarding: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
