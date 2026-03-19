import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '@/api/userApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import type { OnboardingRequest, UpdateUserRequest } from '@/types/api';

export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => userApi.updateMyProfile(payload),
    onSuccess: (user) => {
      queryClient.setQueriesData({ queryKey: queryKeys.user.me() }, user);
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

export const useCreateUserPreferenceMutation = () => {
  return useMutation({
    mutationFn: (payload: OnboardingRequest) =>
      userApi.createMyPreference(payload),
  });
};

export const useUpdateUserPreferenceMutation = () => {
  return useMutation({
    mutationFn: (payload: OnboardingRequest) =>
      userApi.updateMyPreference(payload),
  });
};
