package com.sulddara.server.share.error.exception;

import com.sulddara.server.share.error.ErrorCode;

public class ForbiddenException extends BaseException {
    public ForbiddenException(ErrorCode errorCode) {
        super(errorCode);
    }
}
