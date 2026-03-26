package com.sulddara.server.place.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record PlaceSyncRequestDto(
        @NotBlank(message = "카카오 장소 ID는 필수입니다.")
        String externalPlaceId,
        @NotBlank(message = "장소 이름은 필수입니다.")
        String name,
        String address,
        String category,
        @NotNull(message = "위도(lat)는 필수입니다.")
        Double lat,
        @NotNull(message = "경도(lng)는 필수입니다.")
        Double lng,
        String phone,
        String url
) {
}
