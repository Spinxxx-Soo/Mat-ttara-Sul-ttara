package com.sulddara.server.plan.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

public class PlanNotFoundException extends BaseException {

    public PlanNotFoundException() {
        super(ErrorCode.PLAN_NOT_FOUND);
    }
}
