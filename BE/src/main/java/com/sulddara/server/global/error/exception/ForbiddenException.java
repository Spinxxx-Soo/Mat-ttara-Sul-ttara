package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

public class ForbiddenException extends BaseException {

    public ForbiddenException() {
        super(ErrorCode.FORBIDDEN);
    }

    public ForbiddenException(ErrorCode errorCode) {
        super(errorCode);
    }
}
