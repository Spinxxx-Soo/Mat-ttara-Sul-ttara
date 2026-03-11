package com.sulddara.server.share.error.exception;

import com.sulddara.server.share.error.ErrorCode;

public class EntityNotFoundException extends BaseException {
    public EntityNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }
}
