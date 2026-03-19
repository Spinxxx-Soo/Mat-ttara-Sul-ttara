package com.sulddara.server.auth.service.impl;

import com.sulddara.server.auth.controller.response.TokenResponse;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.auth.service.AuthService;
import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.EntityNotFoundException;
import com.sulddara.server.global.error.exception.UnauthorizedException;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final RedisTemplate<String, String> redisTemplate;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void logout(HttpServletRequest request) {
        String jwt = jwtUtil.getJwtToken(request);

        long remainingTime = 0;
        if (jwt != null && jwtUtil.validateToken(jwt)) {
            remainingTime = jwtUtil.getRemainingTime(jwt);
        }
        if (jwt != null) {
            String key = "blacklist:" + jwt;
            redisTemplate.opsForValue().set(key, "logout", Duration.ofMillis(remainingTime));
        }
    }

    @Override
    public TokenResponse refresh(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String email = jwtUtil.getClaims(refreshToken).getSubject();
        Long userId = jwtUtil.getClaims(refreshToken).get("userId", Long.class);

        String savedToken = redisTemplate.opsForValue().get("refresh:" + email);
        if (savedToken == null || !savedToken.equals(refreshToken)) {
            throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        if (userId == null) {
            throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .build();
    }

}
