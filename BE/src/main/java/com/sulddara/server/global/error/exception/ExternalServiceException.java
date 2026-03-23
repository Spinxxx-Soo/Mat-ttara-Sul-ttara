package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

/**
 * [S14P21B205-370] 외부 서비스(API) 호출 실패 시 발생하는 예외
 */
public class ExternalServiceException extends BaseException {

    public ExternalServiceException() {
        super(ErrorCode.EXTERNAL_API_ERROR);
    }

    public ExternalServiceException(String message) {
        super(ErrorCode.EXTERNAL_API_ERROR, message);
    }
}
