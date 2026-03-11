package com.sulddara.server.plan.service;

import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;

public interface PlanService {

  PlanCreateResponseDto createPlan(Long userId, PlanCreateRequestDto requestDto);
}
