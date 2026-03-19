package com.sulddara.server.global.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT_VALUE(400, "COMMON_400", "잘못된 입력값입니다."),
    INVALID_TYPE_VALUE(400, "COMMON_400", "잘못된 타입의 값입니다."),
    MISSING_REQUEST_PARAMETER(400, "COMMON_400", "필수 요청 파라미터가 누락되었습니다."),
    INVALID_SOCIAL_CODE(400, "AUTH_400", "유효하지 않은 소셜 인가 코드입니다."),

    UNAUTHORIZED(401, "AUTH_401", "인증되지 않은 사용자입니다."),
    INVALID_REFRESH_TOKEN(401, "AUTH_401", "유효하지 않은 리프레시 토큰입니다."),
    EXPIRED_TOKEN(401, "AUTH_401", "만료된 토큰입니다."),
    LOGOUT_TOKEN(401, "AUTH_401", "로그아웃된 토큰입니다."),

    FORBIDDEN(403, "COMMON_403", "권한이 없습니다."),

    USER_NOT_FOUND(404, "USER_404", "사용자를 찾을 수 없습니다."),
    PLAN_NOT_FOUND(404, "PLAN_404", "플랜을 찾을 수 없습니다."),
    PLACE_NOT_FOUND(404, "PLACE_404", "장소를 찾을 수 없습니다."),
    ENTITY_NOT_FOUND(404, "COMMON_404", "엔티티를 찾을 수 없습니다."),

    DUPLICATE_RESOURCE(409, "COMMON_409", "이미 존재하는 리소스입니다."),

    INTERNAL_SERVER_ERROR(500, "COMMON_500", "서버에 오류가 발생했습니다."),
    EXTERNAL_API_ERROR(500, "COMMON_500", "외부 API 호출 중 오류가 발생했습니다."),
    SOCIAL_LOGIN_ERROR(500, "AUTH_500", "소셜 로그인 과정에서 오류가 발생했습니다.");

    private final int status;
    private final String code;
    private final String message;
}
