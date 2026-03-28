import { apiClient } from '@/api/axios';
import type {
  OnboardingRequest,
  UpdateUserRequest,
  UserInfo,
  UserPreference,
} from '@/types/api';

export const userApi = {
  getMyProfile: async (): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>('/api/v1/users/me');
    return response.data;
  },

  getMyPreference: async (): Promise<UserPreference> => {
    const response = await apiClient.get<UserPreference>(
      '/api/v1/users/me/preference'
    );
    return response.data;
  },

  updateMyProfile: async (payload: UpdateUserRequest): Promise<UserInfo> => {
    const response = await apiClient.patch<UserInfo>('/api/v1/users/me', payload);
    return response.data;
  },

  createMyPreference: async (
    payload: OnboardingRequest
  ): Promise<UserPreference> => {
    const response = await apiClient.post<UserPreference>(
      '/api/v1/users/me/preference',
      payload
    );
    return response.data;
  },

  updateMyPreference: async (
    payload: OnboardingRequest
  ): Promise<UserPreference> => {
    const response = await apiClient.patch<UserPreference>(
      '/api/v1/users/me/preference',
      payload
    );
    return response.data;
  },
};
