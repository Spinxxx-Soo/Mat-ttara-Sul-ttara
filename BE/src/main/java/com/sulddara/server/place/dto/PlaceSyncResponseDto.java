package com.sulddara.server.place.dto;

import lombok.Builder;

@Builder
public record PlaceSyncResponseDto(
        Long placeId
) {
}
