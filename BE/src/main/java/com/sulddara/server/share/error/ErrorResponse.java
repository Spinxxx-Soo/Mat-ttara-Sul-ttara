package com.sulddara.server.share.error;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ErrorResponse {
    private final int status;
    private final String message;
    private final String code; // 필요 시 ErrorCode의 이름을 코드로 사용 (예: "INVALID_REFRESH_TOKEN")

    public static ErrorResponse of(ErrorCode errorCode) {
        return ErrorResponse.builder()
                .status(errorCode.getStatus())
                .message(errorCode.getMessage())
                .code(errorCode.name())
                .build();
    }
}