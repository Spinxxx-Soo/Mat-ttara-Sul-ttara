package com.sulddara.server.plan.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanListResponseDto;
import com.sulddara.server.plan.service.PlanService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PlanController 유닛 테스트")
class PlanControllerTest {

  private MockMvc mockMvc;

  @Mock
  private PlanService planService;

  @InjectMocks
  private PlanController planController;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(planController)
        .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
          @Override
          public boolean supportsParameter(MethodParameter parameter) {
            return parameter.getParameterType().isAssignableFrom(CustomOAuth2User.class);
          }

          @Override
          public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
              NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
            return new CustomOAuth2User(
                new DefaultOAuth2User(List.of(), Map.of("id", "test"), "id"),
                1L, "test@test.com", "ROLE_USER"
            );
          }
        })
        .build();
  }

  @Test
  @DisplayName("내 플랜 목록 조회 성공")
  void getMyPlans_success() throws Exception {
    PlanListResponseDto responseDto = PlanListResponseDto.builder()
        .content(List.of())
        .nextCursor(null)
        .hasNext(false)
        .build();

    given(planService.getMyPlans(anyLong(), isNull(), anyInt())).willReturn(responseDto);

    mockMvc.perform(get("/api/v1/plans")
            .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasNext").value(false));
  }

  @Test
  @DisplayName("플랜 상세 조회 성공")
  void getPlanDetail_success() throws Exception {
    PlanDetailResponseDto responseDto = PlanDetailResponseDto.builder()
        .planId(10L)
        .title("상세 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 15, 12, 0))
        .build();

    given(planService.getPlanDetail(anyLong(), anyLong())).willReturn(responseDto);

    mockMvc.perform(get("/api/v1/plans/10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planId").value(10L))
        .andExpect(jsonPath("$.title").value("상세 플랜"));
  }

  @Test
  @DisplayName("공유 플랜 상세 조회 성공")
  void getSharedPlanDetail_success() throws Exception {
    PlanDetailResponseDto responseDto = PlanDetailResponseDto.builder()
        .planId(11L)
        .title("공유 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 16, 12, 0))
        .shareToken("tokentest")
        .build();

    given(planService.getSharedPlanDetail("tokentest")).willReturn(responseDto);

    mockMvc.perform(get("/api/v1/plans/share/tokentest"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planId").value(11L))
        .andExpect(jsonPath("$.title").value("공유 플랜"))
        .andExpect(jsonPath("$.shareToken").value("tokentest"));
  }

  @Test
  @DisplayName("플랜 수정 성공")
  void updatePlan_success() throws Exception {
    PlanDetailResponseDto responseDto = PlanDetailResponseDto.builder()
        .planId(10L)
        .title("수정된 플랜")
        .build();

    given(planService.updatePlan(anyLong(), anyLong(), any())).willReturn(responseDto);

    mockMvc.perform(patch("/api/v1/plans/10")
            .contentType("application/json")
            .content("{\"title\":\"수정된 플랜\", \"meetingAt\":\"2026-03-20T12:00:00\", \"participantCount\":5}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planId").value(10L))
        .andExpect(jsonPath("$.title").value("수정된 플랜"));
  }

  @Test
  @DisplayName("플랜 삭제 성공")
  void deletePlan_success() throws Exception {
    mockMvc.perform(delete("/api/v1/plans/10"))
        .andExpect(status().isNoContent());

    verify(planService).deletePlan(anyLong(), anyLong());
  }
}
