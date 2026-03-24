package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.LoginResponse;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.global.error.exception.UnauthorizedException;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.auth.jwt.NaverUserInfo;
import com.sulddara.server.auth.jwt.OAuth2UserInfo;
import com.sulddara.server.auth.service.SocialLoginService;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
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

@Service("naverSocialLoginService")
@RequiredArgsConstructor
public class NaverSocialLoginServiceImpl implements SocialLoginService {
    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.security.oauth2.client.registration.naver.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.naver.client-secret}")
    private String clientSecret;

    @Override
    public LoginResponse login(String provider, String code, String state) {
        String accessToken = getAccessToken(code, state);
        Map<String, Object> attributes = getUserInfo(accessToken);

        OAuth2UserInfo userInfo = new NaverUserInfo(attributes);

        UserAuthResultDto user = userService.joinOrUpdate(userInfo);

        String jwtAccessToken = jwtUtil.generateAccessToken(user.userId(), user.email(), user.role());
        String jwtRefreshToken = jwtUtil.generateRefreshToken(user.userId(), user.email());

        String email = user.email();
        if (email != null && jwtRefreshToken != null) {
            redisTemplate.opsForValue().set(
                    "refresh:" + email,
                    jwtRefreshToken,
                    Duration.ofDays(14)
            );
        }

        return LoginResponse.builder()
                .accessToken(jwtAccessToken)
                .refreshToken(jwtRefreshToken)
                .isNewUser(user.isNewUser())
                .build();
    }

    @Override
    public String getAccessToken(String code, String state) {
        String url = "https://nid.naver.com/oauth2.0/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("code", code);
        params.add("state", state);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, request, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null) {
                throw new UnauthorizedException(ErrorCode.INVALID_SOCIAL_CODE);
            }
            return (String) body.get("access_token");
        } catch (Exception e) {
            throw new BaseException(ErrorCode.SOCIAL_LOGIN_ERROR);
        }
    }

    @Override
    public Map<String, Object> getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    "https://openapi.naver.com/v1/nid/me", HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("response") == null) {
                throw new BaseException(ErrorCode.SOCIAL_LOGIN_ERROR);
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = (Map<String, Object>) body.get("response");
            return responseMap;
        } catch (Exception e) {
            throw new BaseException(ErrorCode.SOCIAL_LOGIN_ERROR);
        }
    }
}
