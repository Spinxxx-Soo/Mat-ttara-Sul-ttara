import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/types/api';
import { isEmptyResponse } from '@/lib/apiUtils';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
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
apiClient.interceptors.response.use(
  (response) => {
    // S14P21B205-187: 잘못된(빈) 응답 감지 경고
    if (isEmptyResponse(response.data)) {
      console.warn(`[axios] 빈 응답 감지: ${response.config.url}`, response);
    }
    // API 명세상 백엔드가 상태코드 200/201 등으로 데이터를 그대로 내려줌
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    // 만약 error.response가 없다면 네트워크 에러이거나 타임아웃
    if (!error.response) {
      console.error('Network/Timeout Error:', error.message);
      // 여기서 Toast 라이브러리 연동 가능: toast.error('서버와 연결할 수 없습니다.')
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        // 401 Unauthorized: Refresh Token 로직 등
        // 현재는 구현 복잡도를 위해 일단 로그아웃 처리 후 리다이렉트
        console.warn('Unauthorized (401). Logging out...');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        break;

      case 403:
        console.warn('Forbidden (403):', data.message);
        // toast.error('해당 기능에 대한 접근 권한이 없습니다.');
        break;

      case 404:
        console.warn('Not Found (404):', data.message);
        // toast.error('요청하신 리소스를 찾을 수 없습니다.');
        break;

      case 500:
        console.error('Server Error (500):', data.message);
        // toast.error('서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        break;

      default:
        console.error(`Unexpected Error (${status}):`, data.message);
        break;
    }

    // 호출부에서 에러를 한번 더 핸들링 할 수 있도록 reject
    // 호출부에서는 e.response?.data?.message 등을 받아서 사용 가능
    return Promise.reject(error);
  },
);
