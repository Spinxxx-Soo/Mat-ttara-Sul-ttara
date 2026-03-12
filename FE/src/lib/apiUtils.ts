import { AxiosError } from 'axios';
import { ApiError } from '@/types/api';

// ==========================================
// Type Guard
// ==========================================

/**
 * 에러가 백엔드의 ApiError 형태인지 확인합니다.
 */
export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return error instanceof AxiosError && !!error.response?.data?.message;
}

// ==========================================
// Error Message Extractor
// ==========================================

/**
 * AxiosError에서 사용자에게 노출할 에러 메시지를 추출합니다.
 * - 백엔드 응답 메시지가 있으면 우선 사용
 * - 네트워크/타임아웃 에러는 대응 메시지 반환
 * - 그 외에는 fallback 메시지 반환
 */
export function extractApiErrorMessage(error: unknown, fallback = '알 수 없는 오류가 발생했습니다.'): string {
  if (!(error instanceof AxiosError)) return fallback;

  if (!error.response) {
    return '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
  }

  const { status, data } = error.response;

  if (data?.message) return data.message;

  switch (status) {
    case 400: return '잘못된 요청입니다.';
    case 401: return '로그인이 필요합니다.';
    case 403: return '해당 기능에 대한 접근 권한이 없습니다.';
    case 404: return '요청하신 리소스를 찾을 수 없습니다.';
    case 500: return '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    default:  return fallback;
  }
}

// ==========================================
// Field-level Error Extractor
// ==========================================

/**
 * 백엔드 유효성 검사 에러에서 필드별 에러 메시지를 꺼냅니다.
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) return {};
  const { errors } = error.response!.data;
  if (!errors) return {};
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0]])
  );
}

// ==========================================
// S14P21B205-187: 잘못된 응답 감지 보호 로직
// ==========================================

/**
 * API 응답 데이터가 null/undefined인지 확인합니다.
 * 예상치 못한 빈 응답에 대한 보호 로직입니다.
 */
export function isEmptyResponse(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (typeof data === 'object' && Object.keys(data as object).length === 0) return true;
  return false;
}

/**
 * 응답 데이터에 필수 필드가 존재하는지 검증합니다.
 * 누락된 필드가 있으면 콘솔 경고를 출력하고 false를 반환합니다.
 *
 * @example
 *   if (!assertResponseFields(data, ['placeId', 'name', 'lat', 'lng'])) {
 *     throw new Error('장소 응답 데이터 형식이 올바르지 않습니다.');
 *   }
 */
export function assertResponseFields<T extends object>(
  data: unknown,
  requiredFields: (keyof T)[],
): data is T {
  if (!data || typeof data !== 'object') {
    console.warn('[assertResponseFields] 응답 데이터가 객체가 아닙니다:', data);
    return false;
  }

  const missingFields = requiredFields.filter(
    (field) => !(field as string in (data as object)),
  );

  if (missingFields.length > 0) {
    console.warn('[assertResponseFields] 누락된 필드:', missingFields);
    return false;
  }

  return true;
}
