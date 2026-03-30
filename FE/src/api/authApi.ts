import { apiClient } from './axios';
import type { LoginResponse, UserInfo } from '@/types/api';

/**
 * 소셜 로그인 API
 * @param provider - 'google' | 'naver'
 * @param code - 소셜 로그인 인증 코드
 * @param state - 네이버 OAuth state (토큰 교환 시 필수)
 */
export const socialLogin = async (
  provider: 'google' | 'naver',
  code: string,
  state?: string
): Promise<LoginResponse> => {
  const params = new URLSearchParams({ code });
  if (provider === 'naver' && state != null && state !== '') {
    params.set('state', state);
  }
  const response = await apiClient.get<LoginResponse>(
    `/api/v1/auth/callback/${provider}?${params.toString()}`
  );
  return response.data;
};

/**
 * 내 정보 조회 API
 */
export const getUserInfo = async (): Promise<UserInfo> => {
  const response = await apiClient.get<UserInfo>('/api/v1/users/me');
  return response.data;
};

/**
 * 로그아웃 API
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/api/v1/auth/logout');
};

/**
 * 토큰 갱신 API
 * @param refreshToken - 리프레시 토큰
 */
export const refreshToken = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const response = await apiClient.post<{
    accessToken: string;
    refreshToken: string;
  }>('/api/v1/auth/refresh', { refreshToken });
  return response.data;
};
