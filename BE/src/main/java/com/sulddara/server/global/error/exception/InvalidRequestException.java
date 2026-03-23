package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

public class InvalidRequestException extends BaseException {
    public InvalidRequestException(String message) {
        super(ErrorCode.INVALID_INPUT_VALUE, message);
    }
}
