package com.sulddara.server.plan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanSummaryDto {

  private Long planId;
  private String title;
  private LocalDateTime meetingAt;
  private Integer participantCount;
  private Long totalBudget;
  private String planType;
  private LocalDateTime createdAt;
}
