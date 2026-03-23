package com.sulddara.server.plan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public record PlanCreateRequestDto(

        @NotBlank(message = "플랜 제목은 필수입니다.")
        String title,

        @NotNull(message = "약속 일시는 필수입니다.")
        LocalDateTime meetingAt,

        @NotNull(message = "참여 인원 수는 필수입니다.")
        @Min(value = 1, message = "참여 인원은 최소 1명 이상이어야 합니다.")
        Integer participantCount,

        Long totalBudget,
        String planType,
        String memo,

        @Valid
        List<PlanDetailRequestDto> details
) {
    public record PlanDetailRequestDto(

            @NotNull(message = "장소 ID는 필수입니다.")
            Long placeId,

            @NotNull(message = "방문 순서는 필수입니다.")
            @Min(value = 1, message = "방문 순서는 1 이상이어야 합니다.")
            Integer seqNo
    ) {
    }
}
