package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.LoginResponse;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.common.fixture.UserEntityFixture;
import org.springframework.test.util.ReflectionTestUtils;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import org.springframework.core.ParameterizedTypeReference;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NaverSocialLoginServiceImplTest {

    @InjectMocks
    private NaverSocialLoginServiceImpl naverSocialLoginService;

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
    @DisplayName("성공: 네이버 로그인 완료 후 토큰을 발급해줍니다.")
    void login_success() {
        // given
        String code = "naver_auth_code";
        String naverAccessToken = "naver_access_token";

        // 1. 액세스 토큰 요청 Mock
        Map<String, Object> tokenResponseBody = Map.of("access_token", naverAccessToken);
        ResponseEntity<Map<String, Object>> tokenResponse = new ResponseEntity<>(tokenResponseBody, HttpStatus.OK);

        given(restTemplate.exchange(
                contains("oauth2.0/token"),
                eq(HttpMethod.GET),
                isNull(),
                any(ParameterizedTypeReference.class)))
                .willReturn(tokenResponse);

        // 2. 유저 정보 요청 Mock
        Map<String, Object> naverProfile = Map.of(
                "id", "naver_123",
                "email", "test@naver.com"
        );
        Map<String, Object> naverUserInfoBody = Map.of("response", naverProfile);
        ResponseEntity<Map<String, Object>> userInfoResponse = new ResponseEntity<>(naverUserInfoBody, HttpStatus.OK);

        given(restTemplate.exchange(
                eq("https://openapi.naver.com/v1/nid/me"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .willReturn(userInfoResponse);

        // 3. 서비스 로직 Mock
        UserEntity mockUser = UserEntityFixture.createUserWithId(1L);
        ReflectionTestUtils.setField(mockUser, "email", "test@naver.com");
        given(userService.joinOrUpdate(any())).willReturn(new UserAuthResultDto(mockUser.getId(), mockUser.getEmail(), mockUser.getRole(), false));
        given(jwtUtil.generateAccessToken(any(), any(), any())).willReturn("jwt_access");
        given(jwtUtil.generateRefreshToken(any(), any())).willReturn("jwt_refresh");
        given(redisTemplate.opsForValue()).willReturn(valueOperations);

        // when
        LoginResponse response = naverSocialLoginService.login("naver", code);

        // then
        assertThat(response.getAccessToken()).isEqualTo("jwt_access");
        assertThat(response.isNewUser()).isFalse();
    }

    @Test
    @DisplayName("실패: 네이버 API 호출 중 예외가 발생하면 SOCIAL_LOGIN_ERROR가 발생한다.")
    void login_fail_api_error() {
        // given
        given(restTemplate.getForObject(anyString(), eq(Map.class)))
                .willThrow(new RuntimeException("API Error"));

        // when & then
        assertThatThrownBy(() -> naverSocialLoginService.getAccessToken("wrong_code"))
                .isInstanceOf(BaseException.class)
                .hasMessage(ErrorCode.SOCIAL_LOGIN_ERROR.getMessage());
    }
}