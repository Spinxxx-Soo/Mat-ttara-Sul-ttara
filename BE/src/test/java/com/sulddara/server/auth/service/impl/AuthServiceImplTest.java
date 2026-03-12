package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.TokenResponse;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.EntityNotFoundException;
import com.sulddara.server.share.error.exception.UnauthorizedException;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @InjectMocks
    private AuthServiceImpl authService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Nested
    @DisplayName("토큰 재발급(refresh) 테스트")
    class RefreshTokenTest {

        @Mock
        private Claims claims;

        @Test
        @DisplayName("성공: 유효한 리프레시 토큰으로 새로운 액세스 토큰을 발급한다.")
        void refresh_success() {
            // given
            String refreshToken = "valid_refresh_token";
            String email = "test@gmail.com";
            Long userId = 1L;
            String role = "ROLE_USER";
            String newAccessToken = "new_access_token";

            given(jwtUtil.validateToken(refreshToken)).willReturn(true);
            given(jwtUtil.getClaims(refreshToken)).willReturn(claims);
            given(claims.getSubject()).willReturn(email);
            given(claims.get("userId", Long.class)).willReturn(userId);

            User user = User.builder().id(userId).email(email).role(role).build();

            given(jwtUtil.validateToken(refreshToken)).willReturn(true);
            given(jwtUtil.getClaims(refreshToken)).willReturn(claims);
            given(redisTemplate.opsForValue()).willReturn(valueOperations);
            given(valueOperations.get("refresh:" + email)).willReturn(refreshToken);
            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(jwtUtil.generateAccessToken(userId, email, role)).willReturn(newAccessToken);

            // when
            TokenResponse response = authService.refresh(refreshToken);

            // then
            assertThat(response.getAccessToken()).isEqualTo(newAccessToken);
            assertThat(response.getRefreshToken()).isEqualTo(refreshToken);
            verify(jwtUtil, times(1)).generateAccessToken(userId, email, role);
        }

        @Test
        @DisplayName("실패: 유효하지 않은 리프레시 토큰인 경우 UnauthorizedException이 발생한다.")
        void refresh_fail_invalid_token() {
            // given
            String refreshToken = "invalid_token";
            given(jwtUtil.validateToken(refreshToken)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.refresh(refreshToken))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessage(ErrorCode.INVALID_REFRESH_TOKEN.getMessage());
        }

        @Test
        @DisplayName("실패: Redis에 저장된 토큰과 일치하지 않으면 UnauthorizedException이 발생한다.")
        void refresh_fail_token_mismatch() {
            // given
            String refreshToken = "token_a";
            String email = "test@gmail.com";

            given(jwtUtil.validateToken(refreshToken)).willReturn(true);
            given(jwtUtil.getClaims(refreshToken)).willReturn(claims);

            given(claims.getSubject()).willReturn(email);
            given(claims.get("userId", Long.class)).willReturn(1L);

            given(redisTemplate.opsForValue()).willReturn(valueOperations);
            given(valueOperations.get("refresh:" + email)).willReturn("token_b"); // 다른 토큰

            // when & then
            assertThatThrownBy(() -> authService.refresh(refreshToken))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessage(ErrorCode.INVALID_REFRESH_TOKEN.getMessage());
        }

        @Test
        @DisplayName("실패: 토큰 정보에 해당하는 유저가 DB에 없으면 EntityNotFoundException이 발생한다.")
        void refresh_fail_user_not_found() {
            // given
            String refreshToken = "valid_token";
            String email = "test@gmail.com";
            Long userId = 1L;

            given(jwtUtil.validateToken(refreshToken)).willReturn(true);
            given(jwtUtil.getClaims(refreshToken)).willReturn(claims);

            given(claims.getSubject()).willReturn(email);
            given(claims.get("userId", Long.class)).willReturn(1L);

            given(redisTemplate.opsForValue()).willReturn(valueOperations);
            given(valueOperations.get("refresh:" + email)).willReturn(refreshToken);
            given(userRepository.findById(userId)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.refresh(refreshToken))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessage(ErrorCode.USER_NOT_FOUND.getMessage());
        }
    }
}