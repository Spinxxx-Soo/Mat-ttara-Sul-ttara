package com.sulddara.server.auth.service;

import com.sulddara.server.auth.controller.response.LoginResponse;

import java.util.Map;

public interface SocialLoginService {
    LoginResponse login(String provider, String code);

    String getAccessToken(String code);

    Map<String, Object> getUserInfo(String accessToken);
}
