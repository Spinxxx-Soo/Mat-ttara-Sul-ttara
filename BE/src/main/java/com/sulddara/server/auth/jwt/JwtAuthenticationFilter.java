package com.sulddara.server.auth.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.ErrorResponse;
import com.sulddara.server.share.error.exception.BaseException;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try{
            String jwt = jwtUtil.getJwtToken(request);

            if (jwt != null && jwtUtil.validateToken(jwt)){
                if (redisTemplate.hasKey("blacklist:" + jwt)) {
                    throw new BaseException(ErrorCode.LOGOUT_TOKEN);
                }

                Claims claims = jwtUtil.getClaims(jwt);

                Long userId = claims.get("userId", Long.class);
                String email = claims.getSubject();
                String role = claims.get("role", String.class);

                Map<String, Object> attributes = new HashMap<>();
                attributes.put("id", userId);
                attributes.put("email", email);
                attributes.put("role", role);

                CustomOAuth2User user = new CustomOAuth2User(
                        new DefaultOAuth2User(
                                Collections.singleton(new SimpleGrantedAuthority(role)),
                                attributes,
                                "id"
                        ),
                        userId,
                        email,
                        role
                );

                Authentication authenticationToken = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        user.getAuthorities()
                );

                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
            filterChain.doFilter(request, response);
        }catch (BaseException e) {
            setErrorResponse(response, e.getErrorCode());
        } catch (Exception e) {
            setErrorResponse(response, ErrorCode.INTERNAL_SERVER_ERROR);
        }

    }
    private void setErrorResponse(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ErrorResponse errorResponse = ErrorResponse.of(errorCode);

        String result = objectMapper.writeValueAsString(errorResponse);
        response.getWriter().write(result);
    }
}
