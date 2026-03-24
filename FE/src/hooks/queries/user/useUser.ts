import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queries/queryKeys';
import { userApi } from '@/api/userApi';
import { useAuthStore } from '@/stores/authStore';

export const USER_QUERY_KEY = queryKeys.user.me();
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
