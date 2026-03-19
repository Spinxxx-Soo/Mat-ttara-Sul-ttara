package com.sulddara.server.place.exception;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;

/**
 * [S14P21B205-369] 장소 미존재 시 발생하는 예외
 */
public class PlaceNotFoundException extends BaseException {

    public PlaceNotFoundException() {
        super(ErrorCode.PLACE_NOT_FOUND);
    }

    public PlaceNotFoundException(String message) {
        super(ErrorCode.PLACE_NOT_FOUND, message);
    }
}
