package com.sulddara.server.place.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sulddara.server.auth.jwt.JwtUtil;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.ReviewListResponseDto;
import com.sulddara.server.place.dto.ReviewResponseDto;
import com.sulddara.server.place.dto.ReviewUpdateRequestDto;
import com.sulddara.server.place.service.ReviewService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.security.core.context.SecurityContextHolder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import com.sulddara.server.auth.oauth.CustomOAuth2User;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.Map;
import java.util.List;

@WebMvcTest(ReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ReviewControllerTest.SecurityTestConfig.class)
class ReviewControllerTest {

    @TestConfiguration
    static class SecurityTestConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
            argumentResolvers.add(new AuthenticationPrincipalArgumentResolver());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

    @MockitoBean
    private ReviewService reviewService;

    private CustomOAuth2User mockUser;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        mockUser = new CustomOAuth2User(
                new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")), Map.of("id", "12345"), "id"),
                1L, "test@test.com", "ROLE_USER"
        );
        auth = new UsernamePasswordAuthenticationToken(mockUser, null, mockUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("리뷰 생성 API - 정상 요청 시 201 Created를 반환한다")
    void createReview_ShouldReturn201() throws Exception {
        // given
        Long placeId = 1L;
        ReviewCreateRequestDto request = new ReviewCreateRequestDto(5, "정말 좋아요!");
        ReviewResponseDto response = new ReviewResponseDto(10L, 1L, "TestUser", 5, "정말 좋아요!", LocalDateTime.now(), LocalDateTime.now());

        given(reviewService.createReview(any(), eq(placeId), any(ReviewCreateRequestDto.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/places/{placeId}/reviews", placeId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.content").value("정말 좋아요!"));
        
        verify(reviewService).createReview(any(), eq(placeId), any(ReviewCreateRequestDto.class));
    }

    @Test
    @DisplayName("리뷰 조회 API - 해당 장소의 리뷰 목록을 200 OK와 함께 반환한다")
    @WithMockUser
    void getReviews_ShouldReturn200AndResults() throws Exception {
        // given
        Long placeId = 1L;
        ReviewResponseDto reviewResponse = new ReviewResponseDto(10L, 1L, "TestUser", 4, "Great!", LocalDateTime.now(), LocalDateTime.now());
        ReviewListResponseDto response = ReviewListResponseDto.builder()
                .content(List.of(reviewResponse))
                .averageRating(4.0)
                .build();

        given(reviewService.getReviews(eq(placeId), eq(1), eq(10)))
                .willReturn(response);

        // when & then
        mockMvc.perform(get("/api/v1/places/{placeId}/reviews", placeId)
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].rating").value(4))
                .andExpect(jsonPath("$.content[0].content").value("Great!"))
                .andExpect(jsonPath("$.averageRating").value(4.0));
    }

    @Test
    @DisplayName("리뷰 수정 API - 정상 요청 시 200 OK를 반환한다")
    void updateReview_ShouldReturn200() throws Exception {
        // given
        Long placeId = 1L;
        Long reviewId = 10L;
        ReviewUpdateRequestDto request = new ReviewUpdateRequestDto(4, "수정된 리뷰입니다.");
        ReviewResponseDto response = new ReviewResponseDto(reviewId, 1L, "TestUser", 4, "수정된 리뷰입니다.", LocalDateTime.now(), LocalDateTime.now());

        given(reviewService.updateReview(any(), eq(placeId), eq(reviewId), any(ReviewUpdateRequestDto.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(put("/api/v1/places/{placeId}/reviews/{reviewId}", placeId, reviewId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4))
                .andExpect(jsonPath("$.content").value("수정된 리뷰입니다."));
    }

    @Test
    @DisplayName("리뷰 삭제 API - 정상적으로 삭제되면 204 No Content를 반환한다")
    void deleteReview_ShouldReturn204() throws Exception {
        // given
        Long placeId = 1L;
        Long reviewId = 10L;

        // when & then
        mockMvc.perform(delete("/api/v1/places/{placeId}/reviews/{reviewId}", placeId, reviewId)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(reviewService).deleteReview(any(), eq(placeId), eq(reviewId));
    }
}
