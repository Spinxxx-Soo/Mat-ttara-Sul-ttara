import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/types/api';
import { envConfig } from '@/config/env';
import toast from 'react-hot-toast';

export const apiClient = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// Request Interceptor
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    // URL에 인증 코드가 들어가는 등 로그인 과정 중에는 토큰 세팅 생략
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/callback')) {
      return config;
    }

    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// Response Interceptor
// ==========================================
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    if (!error.response) {
      console.error('Network/Timeout Error:', error.message);
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // 401 Unauthorized && Not a retry request
    if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      const refresh_token = useAuthStore.getState().refreshToken;

      if (!refresh_token) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      return new Promise(async (resolve, reject) => {
        try {
          // 순구 axios를 사용하여 인터셉터 루프 방지
          const response = await axios.post(
            `${envConfig.apiBaseUrl}/api/v1/auth/refresh`,
            { refreshToken: refresh_token }
          );

          const { accessToken, refreshToken } = response.data;
          
          useAuthStore.getState().setTokens(accessToken, refreshToken);
          
          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
          originalRequest.headers.Authorization = 'Bearer ' + accessToken;

          processQueue(null, accessToken);
          resolve(apiClient(originalRequest));
        } catch (err) {
          processQueue(err, null);
          useAuthStore.getState().logout();
          window.location.href = '/login';
          reject(err);
        } finally {
          isRefreshing = false;
        }
      });
    }

    switch (status) {
      case 403:
        console.warn('Forbidden (403):', data.message);
        toast.error('접근 권한이 없습니다.');
        break;

      case 404:
        console.warn('Not Found (404):', data.message);
        break;

      case 500:
        console.error('Server Error (500):', data.message);
        toast.error('서버 내부 오류가 발생했습니다.');
        break;

      default:
        console.error(`Unexpected Error (${status}):`, data.message);
        break;
    }

    return Promise.reject(error);
  },
);
