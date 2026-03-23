package com.sulddara.server.place.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BusinessException;

public class ReviewPermissionDeniedException extends BusinessException {

    public ReviewPermissionDeniedException() {
        super(ErrorCode.REVIEW_PERMISSION_DENIED);
    }

    public ReviewPermissionDeniedException(String message) {
        super(message, ErrorCode.REVIEW_PERMISSION_DENIED);
    }
}
