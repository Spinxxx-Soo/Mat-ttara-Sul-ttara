package com.sulddara.server.plan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class PlanCreateRequestDto {

  @NotBlank(message = "플랜 제목은 필수입니다.")
  private String title;

  @NotNull(message = "약속 일시는 필수입니다.")
  private LocalDateTime meetingAt;

  @NotNull(message = "참여 인원 수는 필수입니다.")
  @Min(value = 1, message = "참여 인원은 최소 1명 이상이어야 합니다.")
  private Integer participantCount;

  private Long totalBudget;

  private String planType;

  private String memo;

  @Valid
  private List<PlanDetailRequestDto> details;

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PlanDetailRequestDto {

    @NotNull(message = "장소 ID는 필수입니다.")
    private Long placeId;

    @NotNull(message = "방문 순서는 필수입니다.")
    @Min(value = 1, message = "방문 순서는 1 이상이어야 합니다.")
    private Integer seqNo;
  }
}
