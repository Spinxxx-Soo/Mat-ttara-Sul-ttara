package com.sulddara.server.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserPreferenceResponseDto {
  private String purpose;
  private String ageGroup;
  private String gender;
}
