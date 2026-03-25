package com.sulddara.server.user.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

public class UserPreferenceNotFoundException extends BaseException {

    public UserPreferenceNotFoundException() {
        super(ErrorCode.USER_PREFERENCE_NOT_FOUND);
    }
}
