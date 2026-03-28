import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { queryKeys } from '@/hooks/queries/queryKeys';
import { userApi } from '@/api/userApi';
import { useAuthStore } from '@/stores/authStore';
import type { UserPreference } from '@/types/api';

export const USER_QUERY_KEY = queryKeys.user.me();
export const USER_PREFERENCE_QUERY_KEY = queryKeys.user.preference();
export const USER_QUERY_STALE_TIME = 5 * 60 * 1000;

export const isUserDataStale = (
  lastUserSyncAt: number | null,
  staleTime = USER_QUERY_STALE_TIME
) => {
  if (!lastUserSyncAt) {
    return true;
  }

  return Date.now() - lastUserSyncAt >= staleTime;
};

interface UseUserOptions {
  enabled?: boolean;
}

export const useUser = ({ enabled }: UseUserOptions = {}) => {
  const {
    accessToken,
    hasHydrated,
    isLoggedIn,
    lastUserSyncAt,
    setUser,
    user,
  } = useAuthStore();

  const shouldFetchUser =
    (enabled ?? true) && hasHydrated && isLoggedIn && Boolean(accessToken);

  const query = useQuery({
    queryKey: [...USER_QUERY_KEY, accessToken],
    queryFn: userApi.getMyProfile,
    enabled: shouldFetchUser,
    staleTime: USER_QUERY_STALE_TIME,
    initialData: user ?? undefined,
    initialDataUpdatedAt: lastUserSyncAt ?? undefined,
  });

  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) {
      return;
    }

    if (query.dataUpdatedAt !== lastUserSyncAt) {
      setUser(query.data, query.dataUpdatedAt);
    }
  }, [lastUserSyncAt, query.data, query.dataUpdatedAt, setUser]);

  return {
    ...query,
    user: query.data ?? user,
  };
};

export const useUserPreference = ({ enabled }: UseUserOptions = {}) => {
  const { accessToken, hasHydrated, isLoggedIn } = useAuthStore();

  const shouldFetchPreference =
    (enabled ?? true) && hasHydrated && isLoggedIn && Boolean(accessToken);

  const query = useQuery<UserPreference | null>({
    queryKey: [...USER_PREFERENCE_QUERY_KEY, accessToken],
    queryFn: async () => {
      try {
        return await userApi.getMyPreference();
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: shouldFetchPreference,
    staleTime: USER_QUERY_STALE_TIME,
  });

  return {
    ...query,
    preference: query.data ?? null,
  };
};
