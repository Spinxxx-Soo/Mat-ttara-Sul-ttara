package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.LoginResponse;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import org.springframework.core.ParameterizedTypeReference;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class GoogleSocialLoginServiceImplTest {

    @InjectMocks
    private GoogleSocialLoginServiceImpl googleSocialLoginService;

    @Mock
    private UserService userService;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private RestTemplate restTemplate;

    @Test
    @DisplayName("성공: 구글 로그인 완료 후 토큰을 발급한다.")
    void login_success() {
        // given
        String code = "google_auth_code";
        String googleAccessToken = "google_access_token";
        Map<String, Object> googleUserInfo = Map.of("sub", "12345", "email", "test@gmail.com", "name", "테스터");

        // 1. getAccessToken 내부의 exchange Mock 설정 (POST 방식)
        Map<String, Object> tokenResponseBody = Map.of("access_token", googleAccessToken);
        ResponseEntity<Map<String, Object>> tokenResponse = new ResponseEntity<>(tokenResponseBody, HttpStatus.OK);

        // ParameterizedTypeReference 매칭을 위해 any()를 사용
        given(restTemplate.exchange(
                eq("https://oauth2.googleapis.com/token"),
                eq(HttpMethod.POST),
                any(),
                any(ParameterizedTypeReference.class)))
                .willReturn(tokenResponse);

        // 2. getUserInfo 내부의 exchange Mock 설정 (GET 방식)
        ResponseEntity<Map<String, Object>> userInfoResponse = new ResponseEntity<>(googleUserInfo, HttpStatus.OK);
        given(restTemplate.exchange(
                eq("https://www.googleapis.com/oauth2/v3/userinfo"),
                eq(HttpMethod.GET),
                any(),
                any(ParameterizedTypeReference.class)))
                .willReturn(userInfoResponse);

        // 3. 나머지 Mock 설정 (동일)
        User mockUser = User.builder().id(1L).email("test@gmail.com").role("ROLE_USER").build();
        UserAuthResultDto authResult = new UserAuthResultDto(mockUser, true);

        given(userService.joinOrUpdate(any())).willReturn(authResult);
        given(jwtUtil.generateAccessToken(any(), any(), any())).willReturn("jwt_access");
        given(jwtUtil.generateRefreshToken(any(), any())).willReturn("jwt_refresh");
        given(redisTemplate.opsForValue()).willReturn(valueOperations);

        // when
        LoginResponse response = googleSocialLoginService.login("google", code);

        // then
        assertThat(response.getAccessToken()).isEqualTo("jwt_access");
        assertThat(response.isNewUser()).isTrue();
    }

    @Test
    @DisplayName("실패: 구글 토큰 요청 중 에러 발생 시 SOCIAL_LOGIN_ERROR 예외가 발생한다.")
    void login_fail_google_api_error() {
        // given
        // lenient()를 사용하면 '불필요한 스텁' 경고를 피할 수 있습니다.
        org.mockito.Mockito.lenient().when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenThrow(new RuntimeException("Google API Connection Fail"));

        // when & then
        assertThatThrownBy(() -> googleSocialLoginService.getAccessToken("wrong_code"))
                .isInstanceOf(BaseException.class)
                .hasMessage(ErrorCode.SOCIAL_LOGIN_ERROR.getMessage());
    }
}