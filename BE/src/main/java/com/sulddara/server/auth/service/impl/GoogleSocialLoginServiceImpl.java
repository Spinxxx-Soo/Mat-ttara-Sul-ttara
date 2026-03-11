package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.LoginResponse;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.share.error.exception.UnauthorizedException;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.auth.jwt.GoogleUserInfo;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.auth.jwt.OAuth2UserInfo;
import com.sulddara.server.auth.service.SocialLoginService;
import com.sulddara.server.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

@Service("googleSocialLoginService")
@RequiredArgsConstructor
public class GoogleSocialLoginServiceImpl implements SocialLoginService {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    @Value("${spring.security.oauth2.client.registration.google.redirect-uri}")
    private String redirectUri;

    @Override
    public LoginResponse login(String provider, String code) {
        String accessToken = getAccessToken(code);
        Map<String, Object> attributes = getUserInfo(accessToken);

        OAuth2UserInfo userInfo = new GoogleUserInfo(attributes);

        UserAuthResultDto user = userService.joinOrUpdate(userInfo);

        String jwtAccessToken = jwtUtil.generateAccessToken(user.user().getId(), user.user().getEmail(), user.user().getRole());
        String jwtRefreshToken = jwtUtil.generateRefreshToken(user.user().getId(), user.user().getEmail());


        redisTemplate.opsForValue().set(
                "refresh:" + user.user().getEmail(),
                jwtRefreshToken,
                Duration.ofDays(14)
        );

        return LoginResponse.builder()
                .accessToken(jwtAccessToken)
                .refreshToken(jwtRefreshToken)
                .isNewUser(user.isNewUser())
                .build();
    }

    @Override
    public String getAccessToken(String code) {
        String url = "https://oauth2.googleapis.com/token";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("grant_type", "authorization_code");

        try {
            Map<String, Object> response = restTemplate.postForObject(url, params, Map.class);
            if (response == null || response.get("access_token") == null) {
                throw new UnauthorizedException(ErrorCode.INVALID_SOCIAL_CODE);
            }
            return (String) response.get("access_token");
        }catch (Exception e) {
            throw new BaseException(ErrorCode.SOCIAL_LOGIN_ERROR);
        }
    }

    @Override
    public Map<String, Object> getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo", HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            throw new BaseException(ErrorCode.SOCIAL_LOGIN_ERROR);
        }
    }
}
