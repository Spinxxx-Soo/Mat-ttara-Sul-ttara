package com.sulddara.server.plan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanDetailResponseDto {

  private Long planId;
  private String title;
  private LocalDateTime meetingAt;
  private Integer participantCount;
  private Long totalBudget;
  private String planType;
  private String memo;
  private String shareToken;
  private List<PlanDetailPlaceDto> places;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
