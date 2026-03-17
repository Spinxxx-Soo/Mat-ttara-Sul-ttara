package com.sulddara.server.plan.service;

import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanListResponseDto;
import com.sulddara.server.plan.dto.PlanUpdateRequestDto;

public interface PlanService {

  PlanCreateResponseDto createPlan(Long userId, PlanCreateRequestDto requestDto);

  PlanListResponseDto getMyPlans(Long userId, Long cursor, int size);

  PlanDetailResponseDto getPlanDetail(Long userId, Long planId);

  PlanDetailResponseDto getSharedPlanDetail(String shareToken);

  PlanDetailResponseDto updatePlan(Long userId, Long planId, PlanUpdateRequestDto requestDto);

  void deletePlan(Long userId, Long planId);
}
