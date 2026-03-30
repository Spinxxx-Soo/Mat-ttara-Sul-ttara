package com.sulddara.server.global.error.exception;

import com.sulddara.server.global.error.ErrorCode;

/**
 * [S14P21B205-368] 404 Not Found 예외 (공통 엔티티용)
 */
public class EntityNotFoundException extends BaseException {
    public EntityNotFoundException() {
        super(ErrorCode.ENTITY_NOT_FOUND);
    }
    public EntityNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }
    public EntityNotFoundException(String message) {
        super(ErrorCode.ENTITY_NOT_FOUND, message);
    }
}
