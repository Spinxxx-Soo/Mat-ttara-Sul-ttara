package com.sulddara.server.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserPreferenceResponseDto {
  private Long prefId;
  private Long userId;
  private String usageType;
  private String ageGroup;
  private String gender;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
