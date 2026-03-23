package com.sulddara.server.place.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

public class ReviewPermissionDeniedException extends BaseException {

    public ReviewPermissionDeniedException() {
        super(ErrorCode.REVIEW_PERMISSION_DENIED);
    }

    public ReviewPermissionDeniedException(String message) {
        super(ErrorCode.REVIEW_PERMISSION_DENIED, message);
    }
}
