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

    // 네트워크 에러 (서버 응답 없음)
    if (!error.response) {
        return '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
    }

    const { status, data } = error.response;

    // 백엔드 ApiError 메시지 우선 사용
    if (data?.message) return data.message;

    // HTTP status 기반 기본 메시지
    switch (status) {
        case 400: return '잘못된 요청입니다.';
        case 401: return '로그인이 필요합니다.';
        case 403: return '해당 기능에 대한 접근 권한이 없습니다.';
        case 404: return '요청하신 리소스를 찾을 수 없습니다.';
        case 500: return '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        default: return fallback;
    }
}

// ==========================================
// Field-level Error Extractor
// ==========================================

/**
 * 백엔드 유효성 검사 에러에서 특정 필드의 에러 메시지를 꺼냅니다.
 * @example
 *   extractFieldError(error, 'email') // → "이미 사용 중인 이메일입니다."
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
    if (!isApiError(error)) return {};
    const { errors } = error.response!.data;
    if (!errors) return {};
    // 각 필드의 첫 번째 에러 메시지만 반환
    return Object.fromEntries(
        Object.entries(errors).map(([field, messages]) => [field, messages[0]])
    );
}
