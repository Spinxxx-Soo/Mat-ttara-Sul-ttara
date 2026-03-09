package com.sulddara.server.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceRequestDto {

  @NotBlank(message = "사적/공적 목적은 필수입니다.")
  @Pattern(regexp = "^(사적|공적)$", message = "목적은 '사적' 방이나 '공적' 방만 가능합니다.")
  private String usageType;

  @NotBlank(message = "나잇대는 필수입니다.")
  private String ageGroup;

  @NotBlank(message = "성별은 필수입니다.")
  private String gender;
}
