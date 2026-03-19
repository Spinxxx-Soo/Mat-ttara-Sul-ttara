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
    void login_success1() {
        // given
        String code = "naver_auth_code";
        String naverAccessToken = "naver_access_token";

        // 1. 액세스 토큰 요청 Mock
        Map<String, Object> tokenResponseBody = Map.of("access_token", naverAccessToken);
        ResponseEntity<Map<String, Object>> tokenResponse = new ResponseEntity<>(tokenResponseBody, HttpStatus.OK);

        // [수정] getAccessToken 내부의 exchange 호출 매칭
        given(restTemplate.exchange(
                contains("oauth2.0/token"), // URL에 토큰 관련 문자열 포함 확인
                eq(HttpMethod.GET),
                isNull(), // 주시: 서비스에서 null을 넘김
                any(ParameterizedTypeReference.class))) // ParameterizedTypeReference 매칭
                .willReturn(tokenResponse);

        // 2. 유저 정보 요청 Mock
        Map<String, Object> naverProfile = Map.of(
                "id", "naver_123",
                "email", "test@naver.com"
        );
        Map<String, Object> naverUserInfoBody = Map.of("response", naverProfile);
        ResponseEntity<Map<String, Object>> userInfoResponse = new ResponseEntity<>(naverUserInfoBody, HttpStatus.OK);

        // [수정] getUserInfo 내부의 exchange 호출 매칭
        given(restTemplate.exchange(
                eq("https://openapi.naver.com/v1/nid/me"),
                eq(HttpMethod.GET),
                any(HttpEntity.class), // 헤더가 포함된 Entity
                any(ParameterizedTypeReference.class)))
                .willReturn(userInfoResponse);

        // 3. 기타 Mock (동일)
        User mockUser = User.builder().id(1L).email("test@naver.com").role("ROLE_USER").build();
        given(userService.joinOrUpdate(any())).willReturn(new UserAuthResultDto(mockUser, false));
        given(jwtUtil.generateAccessToken(anyLong(), anyString(), anyString())).willReturn("jwt_access");
        given(jwtUtil.generateRefreshToken(anyLong(), anyString())).willReturn("jwt_refresh");
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