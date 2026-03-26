package com.sulddara.server.place.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.PlaceReviewsResponseDto;
import com.sulddara.server.place.dto.ReviewResponseDto;
import com.sulddara.server.place.dto.ReviewUpdateRequestDto;
import com.sulddara.server.place.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/places/{placeId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<PlaceReviewsResponseDto> getReviews(
            @PathVariable Long placeId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        
        PlaceReviewsResponseDto response = reviewService.getReviews(placeId, page, size);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<ReviewResponseDto> createReview(
            @AuthenticationPrincipal CustomOAuth2User user,
            @PathVariable Long placeId,
            @Valid @RequestBody ReviewCreateRequestDto request) {
        
        Long userId = user.getUserId();
        ReviewResponseDto response = reviewService.createReview(userId, placeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewResponseDto> updateReview(
            @AuthenticationPrincipal CustomOAuth2User user,
            @PathVariable Long placeId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewUpdateRequestDto request) {
        
        Long userId = user.getUserId();
        ReviewResponseDto response = reviewService.updateReview(userId, placeId, reviewId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @AuthenticationPrincipal CustomOAuth2User user,
            @PathVariable Long placeId,
            @PathVariable Long reviewId) {
        
        Long userId = user.getUserId();
        reviewService.deleteReview(userId, placeId, reviewId);
        return ResponseEntity.noContent().build();
    }
}
