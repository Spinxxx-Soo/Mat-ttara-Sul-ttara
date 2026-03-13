package com.sulddara.server.plan.mapper;

import com.sulddara.server.place.domain.Place;
import com.sulddara.server.plan.domain.Plan;
import com.sulddara.server.plan.domain.PlanDetail;
import com.sulddara.server.plan.dto.PlaceSummaryDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.dto.PlanDetailPlaceDto;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanSummaryDto;
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

  public PlanSummaryDto toSummary(Plan plan) {
    return PlanSummaryDto.builder()
        .planId(plan.getId())
        .title(plan.getTitle())
        .meetingAt(plan.getMeetingAt())
        .participantCount(plan.getParticipantCount())
        .totalBudget(plan.getTotalBudget())
        .planType(plan.getPlanType())
        .createdAt(plan.getCreatedAt())
        .build();
  }

  public PlaceSummaryDto toPlaceSummary(Place place) {
    return PlaceSummaryDto.builder()
        .placeId(place.getId())
        .name(place.getName())
        .category(place.getCategory())
        .lat(place.getLat())
        .lng(place.getLng())
        .imageUrl(place.getImageUrl())
        .build();
  }

  public PlanDetailPlaceDto toDetailPlace(PlanDetail detail) {
    return PlanDetailPlaceDto.builder()
        .detailId(detail.getId())
        .placeId(detail.getPlace().getId())
        .seqNo(detail.getSeqNo())
        .recommendReason(detail.getRecommendReason())
        .place(toPlaceSummary(detail.getPlace()))
        .build();
  }

  public PlanDetailResponseDto toDetailResponse(Plan plan) {
    return PlanDetailResponseDto.builder()
        .planId(plan.getId())
        .title(plan.getTitle())
        .meetingAt(plan.getMeetingAt())
        .participantCount(plan.getParticipantCount())
        .totalBudget(plan.getTotalBudget())
        .planType(plan.getPlanType())
        .memo(plan.getMemo())
        .shareToken(plan.getShareToken())
        .places(plan.getDetails().stream().map(this::toDetailPlace).toList())
        .createdAt(plan.getCreatedAt())
        .updatedAt(plan.getUpdatedAt())
        .build();
  }
}

