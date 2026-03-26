package com.sulddara.server.place.dto;

import com.sulddara.server.place.dto.ReviewResponseDto;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlaceReviewsResponseDto {
    private List<ReviewResponseDto> content;
    private PageInfoDto pageInfo;
    private Double averageRating;

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

