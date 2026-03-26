import { AxiosError } from 'axios';
import { ApiError } from '@/types/api';

interface ApiErrorInfo {
  title: string;
  message: string;
  status: number | null;
  code?: string;
  isNotFoundError: boolean;
  isAuthError: boolean;
}

export const useApiError = (error: unknown): ApiErrorInfo => {
  // 기본 에러 (네트워크 오류, 타임아웃, 포맷 불일치 등)
  const defaultInfo: ApiErrorInfo = {
    title: '오류가 발생했습니다.',
    message: '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.',
    status: null,
    isNotFoundError: false,
    isAuthError: false,
  };

  if (!error) return defaultInfo;

  if (error instanceof AxiosError) {
    const axiosError = error as AxiosError<ApiError>;
    const status = axiosError.response?.status ?? null;
    const apiMessage = axiosError.response?.data?.message;
    const apiCode = axiosError.response?.data?.code;

    // HTTP Status Code 기반 메시지 매핑
    switch (status) {
      case 401:
        return {
          title: '로그인이 필요합니다.',
          message: '안전한 사용을 위해 다시 로그인해주세요.',
          status,
          code: apiCode,
          isNotFoundError: false,
          isAuthError: true,
        };
      case 403:
        return {
          title: '접근 권한이 없습니다.',
          message: apiMessage || '이 페이지를 볼 수 있는 권한이 없습니다.',
          status,
          code: apiCode,
          isNotFoundError: false,
          isAuthError: true,
        };
      case 404:
        return {
          title: '찾을 수 없습니다.',
          message: apiMessage || '요청하신 데이터를 찾을 수 없거나 삭제되었습니다.',
          status,
          code: apiCode,
          isNotFoundError: true,
          isAuthError: false,
        };
      case 400:
        return {
          title: '잘못된 요청입니다.',
          message: apiMessage || '입력하신 정보를 다시 확인해주세요.',
          status,
          code: apiCode,
          isNotFoundError: false,
          isAuthError: false,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: '서버 오류가 발생했습니다.',
          message: '서비스 이용에 불편을 드려 죄송합니다. 잠시 후 다시 시도해주세요.',
          status,
          code: apiCode,
          isNotFoundError: false,
          isAuthError: false,
        };
      default:
        // 알 수 없는 status 코드
        return {
          ...defaultInfo,
          message: apiMessage || defaultInfo.message,
          status,
          code: apiCode,
        };
    }
  }

  // AxiosError가 아닌 일반 JS 에러의 경우
  if (error instanceof Error) {
    return {
      ...defaultInfo,
      message: error.message || defaultInfo.message,
    };
  }

  return defaultInfo;
};
