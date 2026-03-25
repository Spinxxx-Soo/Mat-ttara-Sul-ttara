package com.sulddara.server.auth.service;

import com.sulddara.server.auth.controller.response.TokenResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface AuthService {

    void logout(HttpServletRequest request);

    TokenResponse refresh(String refreshToken);
}
