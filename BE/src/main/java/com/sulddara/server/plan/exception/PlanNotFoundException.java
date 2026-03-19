package com.sulddara.server.plan.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

/**
 * [S14P21B205-369] 플랜 미존재 시 발생하는 예외
 */
public class PlanNotFoundException extends BaseException {

    public PlanNotFoundException() {
        super(ErrorCode.PLAN_NOT_FOUND);
    }

    public PlanNotFoundException(String message) {
        super(ErrorCode.PLAN_NOT_FOUND, message);
    }
}
