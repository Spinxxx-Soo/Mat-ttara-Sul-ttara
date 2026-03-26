package com.sulddara.server.place.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PlaceUpsertRequestDto(
        @NotBlank String provider,
        @NotBlank String externalPlaceId,
        @NotBlank String name,
        String address,
        String phone,
        @NotNull Double lat,
        @NotNull Double lng,
        String category,
        String imageUrl
) {
}

