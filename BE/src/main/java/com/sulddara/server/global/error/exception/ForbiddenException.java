package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

/**
 * [S14P21B205-368] 403 Forbidden 예외
 */
public class ForbiddenException extends BaseException {
    public ForbiddenException() {
        super(ErrorCode.FORBIDDEN);
    }
    public ForbiddenException(ErrorCode errorCode) {
        super(errorCode);
    }
    public ForbiddenException(String message) {
        super(ErrorCode.FORBIDDEN, message);
    }
}
