package com.sulddara.server.plan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSummaryDto {

  private Long placeId;
  private String name;
  private String category;
  private Double lat;
  private Double lng;
  private String imageUrl;
}
