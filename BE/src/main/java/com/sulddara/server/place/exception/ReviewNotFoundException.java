package com.sulddara.server.place.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BusinessException;

public class ReviewNotFoundException extends BusinessException {

    public ReviewNotFoundException() {
        super(ErrorCode.REVIEW_NOT_FOUND);
    }

    public ReviewNotFoundException(String message) {
        super(message, ErrorCode.REVIEW_NOT_FOUND);
    }
}
