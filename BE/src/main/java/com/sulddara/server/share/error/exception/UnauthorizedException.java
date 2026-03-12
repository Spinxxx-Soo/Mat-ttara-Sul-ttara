package com.sulddara.server.share.error.exception;

import com.sulddara.server.share.error.ErrorCode;
import lombok.Getter;

@Getter
public class UnauthorizedException extends BaseException {
    public UnauthorizedException(ErrorCode errorCode) {
        super(errorCode);
    }
}
