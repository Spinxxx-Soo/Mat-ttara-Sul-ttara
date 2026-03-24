import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  needsOnboarding: boolean;
  hasHydrated: boolean;
  lastUserSyncAt: number | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserInfo, syncedAt?: number) => void;
  setAuth: (access: string, refresh: string, isNewUser: boolean) => void;
  completeOnboarding: () => void;
  markHydrated: () => void;
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
      hasHydrated: false,
      lastUserSyncAt: null,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isLoggedIn: true }),
      setUser: (user, syncedAt = Date.now()) =>
        set({ user, lastUserSyncAt: syncedAt }),
      setAuth: (access, refresh, isNewUser) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          user: null,
          isLoggedIn: true,
          needsOnboarding: isNewUser,
          lastUserSyncAt: null,
        }),
      completeOnboarding: () => set({ needsOnboarding: false }),
      markHydrated: () => set({ hasHydrated: true }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isLoggedIn: false,
          needsOnboarding: false,
          lastUserSyncAt: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        needsOnboarding: state.needsOnboarding,
        lastUserSyncAt: state.lastUserSyncAt,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('auth-storage rehydration failed:', error);
        }

        state?.markHydrated();
      },
    }
  )
);
