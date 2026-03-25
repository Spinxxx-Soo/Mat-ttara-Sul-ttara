package com.sulddara.server.plan.service;

import com.sulddara.server.plan.dto.*;
import org.springframework.transaction.annotation.Transactional;

public interface PlanService {

    PlanCreateResponseDto createPlan(Long userId, PlanCreateRequestDto requestDto);

    PlanCreateResponseDto createPlanFromAi(Long userId, AiPlanCreateRequestDto request);

    PlanListResponseDto getMyPlans(Long userId, Long cursor, int size);

    PlanDetailResponseDto getPlanDetail(Long userId, Long planId);

    PlanDetailResponseDto getSharedPlanDetail(String shareToken);

    PlanDetailResponseDto updatePlan(Long userId, Long planId, PlanUpdateRequestDto requestDto);

    void deletePlan(Long userId, Long planId);
}
