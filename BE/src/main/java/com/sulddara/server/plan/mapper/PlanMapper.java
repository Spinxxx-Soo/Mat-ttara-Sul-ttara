package com.sulddara.server.plan.mapper;

import com.sulddara.server.plan.domain.Plan;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import org.springframework.stereotype.Component;

@Component
public class PlanMapper {

  private static final String SHARE_URL_PREFIX = "/api/v1/plans/share/";

  public PlanCreateResponseDto toCreateResponse(Plan plan) {
    return PlanCreateResponseDto.builder()
        .planId(plan.getId())
        .title(plan.getTitle())
        .shareToken(plan.getShareToken())
        .shareUrl(SHARE_URL_PREFIX + plan.getShareToken())
        .createdAt(plan.getCreatedAt())
        .build();
  }
}
