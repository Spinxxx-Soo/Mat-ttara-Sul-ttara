package com.sulddara.server.place.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

public class ReviewNotFoundException extends BaseException {

    public ReviewNotFoundException() {
        super(ErrorCode.REVIEW_NOT_FOUND);
    }

    public ReviewNotFoundException(String message) {
        super(ErrorCode.REVIEW_NOT_FOUND, message);
    }
}
