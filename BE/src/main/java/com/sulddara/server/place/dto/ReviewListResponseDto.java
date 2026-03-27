package com.sulddara.server.place.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ReviewListResponseDto {
    private List<ReviewResponseDto> content;
    private PageInfoDto pageInfo;
    private Double averageRating;

    @Getter
    @Builder
    public static class PageInfoDto {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean hasNext;
    }
}
