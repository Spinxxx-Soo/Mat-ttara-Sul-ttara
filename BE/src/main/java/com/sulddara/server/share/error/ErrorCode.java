package com.sulddara.server.share.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 400 Bad Request
    INVALID_INPUT_VALUE(400, "잘못된 입력값입니다."),
    INVALID_TYPE_VALUE(400, "잘못된 타입의 값입니다."),
    SOCIAL_LOGIN_ERROR(400, "소셜 로그인 서버와의 통신에 실패했습니다."),
    INVALID_SOCIAL_CODE(400, "유효하지 않은 소셜 인가 코드입니다."),

    // 401 Unauthorized
    UNAUTHORIZED(401, "인증되지 않은 사용자입니다."),
    INVALID_REFRESH_TOKEN(401, "유효하지 않은 리프레시 토큰입니다."),
    EXPIRED_TOKEN(401, "만료된 토큰입니다."),
    LOGOUT_TOKEN(401, "로그아웃된 토큰입니다."),

    // 403 Forbidden
    FORBIDDEN(403, "권한이 없습니다."),

    // 404 Not Found
    USER_NOT_FOUND(404, "사용자를 찾을 수 없습니다."),
    ENTITY_NOT_FOUND(404, "엔티티를 찾을 수 없습니다."),
    SESSION_NOT_FOUND(404, "해당 세션을 찾을 수 없습니다."),

    // 500 Internal Server Error
    INTERNAL_SERVER_ERROR(500, "서버에 오류가 발생했습니다.");

    private final int status;
    private final String message;
}