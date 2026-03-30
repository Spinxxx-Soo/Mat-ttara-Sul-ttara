package com.sulddara.server.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UserPreferenceRequestDto(

        @NotBlank(message = "사적/공적 목적은 필수입니다.")
        @Pattern(regexp = "^(사적|공적)$", message = "목적은 '사적' 방이나 '공적' 방만 가능합니다.")
        String usageType,

        @NotBlank(message = "나잇대는 필수입니다.")
        String ageGroup,

        @NotBlank(message = "성별은 필수입니다.")
        String gender
) {
}
