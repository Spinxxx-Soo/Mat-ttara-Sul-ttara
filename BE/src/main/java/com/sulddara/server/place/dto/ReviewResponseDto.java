package com.sulddara.server.place.dto;

import com.sulddara.server.place.domain.ReviewEntity;

import java.time.LocalDateTime;

public record ReviewResponseDto(
        Long reviewId,
        Long userId,
        String userName,
        Integer rating,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReviewResponseDto from(ReviewEntity review) {
        return new ReviewResponseDto(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getName(),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
