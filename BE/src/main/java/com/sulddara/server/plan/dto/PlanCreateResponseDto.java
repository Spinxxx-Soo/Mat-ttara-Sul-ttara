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
public class PlanCreateResponseDto {

  private Long planId;
  private String title;
  private String shareToken;
  private String shareUrl;
  private LocalDateTime createdAt;
}
