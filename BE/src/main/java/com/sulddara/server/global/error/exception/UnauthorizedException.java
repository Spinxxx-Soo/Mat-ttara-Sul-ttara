package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

/**
 * [S14P21B205-368] 401 Unauthorized 예외
 */
public class UnauthorizedException extends BaseException {
    public UnauthorizedException() {
        super(ErrorCode.UNAUTHORIZED);
    }
    public UnauthorizedException(ErrorCode errorCode) {
        super(errorCode);
    }
    public UnauthorizedException(String message) {
        super(ErrorCode.UNAUTHORIZED, message);
    }
}
