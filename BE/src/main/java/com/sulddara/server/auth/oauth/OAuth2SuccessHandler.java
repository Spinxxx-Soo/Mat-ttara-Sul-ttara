package com.sulddara.server.auth.oauth;

import com.sulddara.server.auth.jwt.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        // 인증된 유저 정보 가져오기
        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();

        String accessToken = jwtUtil.generateAccessToken(oAuth2User.getUserId(), oAuth2User.getEmail(), oAuth2User.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(oAuth2User.getUserId(), oAuth2User.getEmail());

        response.addHeader("Authorization", "Bearer " + accessToken);

        response.sendRedirect("http://localhost:5173/login?accessToken=" + accessToken);
    }
}