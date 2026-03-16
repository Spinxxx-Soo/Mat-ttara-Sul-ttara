package com.sulddara.server.plan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanDetailPlaceDto {

  private Long detailId;
  private Long placeId;
  private Integer seqNo;
  private String recommendReason;
  private PlaceSummaryDto place;
}
