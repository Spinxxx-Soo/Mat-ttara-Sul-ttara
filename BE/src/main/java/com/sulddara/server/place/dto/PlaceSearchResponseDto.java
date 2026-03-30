package com.sulddara.server.place.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlaceSearchResponseDto {
    private List<PlaceItemDto> content;
    private PageInfoDto pageInfo;

    @Getter
    @Builder
    public static class PlaceItemDto {
        private Long placeId;
        private String name;
        private String address;
        private Double lat;
        private Double lng;
        private Double rating;
        private String imageUrl;
        private String category;
        private Boolean isOpen;
        private Integer reviewCount;
        private Double distance;
    }

    @Getter
    @Builder
    public static class PageInfoDto {
        private int page;
        private int size;
        private int totalElements;
        private int totalPages;
        private boolean hasNext;
    }
}
