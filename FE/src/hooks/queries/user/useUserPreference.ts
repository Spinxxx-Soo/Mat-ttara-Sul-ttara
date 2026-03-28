import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { queryKeys } from '@/hooks/queries/queryKeys';

export const useUserPreference = (options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: queryKeys.user.preference(),
    queryFn: userApi.getMyPreference,
    ...options,
  });
};
