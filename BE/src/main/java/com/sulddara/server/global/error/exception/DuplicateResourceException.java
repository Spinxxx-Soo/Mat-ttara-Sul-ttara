package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

public class DuplicateResourceException extends BaseException {
    public DuplicateResourceException() {
        super(ErrorCode.DUPLICATE_RESOURCE, ErrorCode.DUPLICATE_RESOURCE.getMessage());
    }

    public DuplicateResourceException(String message) {
        super(ErrorCode.DUPLICATE_RESOURCE, message);
    }
}
