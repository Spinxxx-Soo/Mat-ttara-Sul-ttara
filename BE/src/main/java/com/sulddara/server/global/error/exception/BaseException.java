package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;
import lombok.Getter;

/**
 * [S14P21B205-368] 프로젝트 전체 커스텀 예외의 기본 클래스
 */
@Getter
public class BaseException extends RuntimeException {

    private final ErrorCode errorCode;

    public BaseException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BaseException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
