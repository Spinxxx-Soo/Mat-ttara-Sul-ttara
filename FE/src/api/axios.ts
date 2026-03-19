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
// Utils for Request Management
// ==========================================

// 진행 중인 요청을 추적하기 위한 Map (Key: RequestKey, Value: AbortController)
const pendingRequests = new Map<string, AbortController>();

/**
 * 요청 고유 키 생성 (Method + URL + Params/Data)
 * 객체 키 순서를 정렬하여 직렬화함으로써 일관성을 유지합니다.
 */
const generateRequestKey = (config: any) => {
  const { method, url, params, data } = config;

  const serialize = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return String(obj);
    return JSON.stringify(
      Object.keys(obj)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = serialize(obj[key]);
          return acc;
        }, {})
    );
  };

  return [method, url, serialize(params), serialize(data)].join('&');
};

// ==========================================
// Request Interceptor
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    // 1. /auth 로직 등은 deduplication 제외
    const isAuthRequest = config.url?.includes('/auth/login') || config.url?.includes('/auth/callback') || config.url?.includes('/auth/refresh');

    // 2. Opt-in Deduplication (GET 기반 + replace-prev 설정 시)
    const canDedupe = config.method?.toLowerCase() === 'get' && config.meta?.dedupe === 'replace-prev';

    if (!isAuthRequest && canDedupe) {
      const requestKey = generateRequestKey(config);

      // 이미 동일한 요청이 진행 중이면 이전 요청 취소
      if (pendingRequests.has(requestKey)) {
        pendingRequests.get(requestKey)?.abort();
        pendingRequests.delete(requestKey);
      }

      // 새 AbortController 생성 및 등록
      const controller = new AbortController();
      config.signal = controller.signal;
      pendingRequests.set(requestKey, controller);
      
      // 요청 config에 키와 컨트롤러 참조를 저장 (응답에서 안전하게 삭제하기 위함)
      (config as any)._requestKey = requestKey;
      (config as any)._abortController = controller;
    }

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
    const config = response.config as any;

    // 1. Pending Request Clear (안전한 삭제)
    if (config._requestKey && pendingRequests.get(config._requestKey) === config._abortController) {
      pendingRequests.delete(config._requestKey);
    }

    // 2. 잘못된 응답 형태 감지용 보호 로직 (S14P21B205-187)
    const { status, data, headers } = response;
    const contentType = headers['content-type'] || '';

    // 204(No Content), 205(Reset Content), HEAD 요청 등 본문이 없는 성공 응답은 제외
    const isBodylessSuccess = status === 204 || status === 205 || config.method?.toLowerCase() === 'head';

    if (!isBodylessSuccess && contentType.includes('application/json')) {
      if (data === null || data === undefined) {
        console.error(`[API Guard] Unexpected empty JSON response for ${config.url}`);
        // 필요 시 여기서 에러 객체를 던져서 reject 처리할 수 있음 (현재는 일단 로그 출력 후 진행)
      }
    }

    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as any;

    // 1. 요청 취소(ERR_CANCELED)는 로그나 토스트 없이 조용히 무시
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return new Promise(() => {}); // 진행 중인 프로미스를 절대 종료하지 않거나, 적절히 catch에서 처리되도록 유도
    }

    // 2. Pending Request Clear
    if (originalRequest?._requestKey && pendingRequests.get(originalRequest._requestKey) === originalRequest._abortController) {
      pendingRequests.delete(originalRequest._requestKey);
    }

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
