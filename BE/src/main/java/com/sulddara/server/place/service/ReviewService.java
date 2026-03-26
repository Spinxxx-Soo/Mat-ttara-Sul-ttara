package com.sulddara.server.place.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.domain.ReviewEntity;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.PlaceReviewsResponseDto;
import com.sulddara.server.place.dto.ReviewResponseDto;
import com.sulddara.server.place.dto.ReviewUpdateRequestDto;
import com.sulddara.server.place.exception.PlaceNotFoundException;
import com.sulddara.server.place.exception.ReviewNotFoundException;
import com.sulddara.server.global.error.exception.DuplicateResourceException;
import com.sulddara.server.global.error.exception.ForbiddenException;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.ReviewRepository;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.PageRequest;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;

    public PlaceReviewsResponseDto getReviews(Long placeId, int page, int size) {
        if (!placeRepository.existsById(placeId)) {
            throw new PlaceNotFoundException();
        }

        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);

        var pageable = PageRequest.of(safePage - 1, safeSize);
        var reviewPage = reviewRepository.findAllByPlaceIdOrderByCreatedAtDesc(placeId, pageable);

        List<ReviewResponseDto> content = reviewPage.getContent()
                .stream()
                .map(ReviewResponseDto::from)
                .toList();

        Double averageRating = placeRepository.getAverageRatingByPlaceId(placeId);

        PlaceReviewsResponseDto.PageInfoDto pageInfo = PlaceReviewsResponseDto.PageInfoDto.builder()
                .page(safePage)
                .size(safeSize)
                .totalElements((int) reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .hasNext(reviewPage.hasNext())
                .build();

        return PlaceReviewsResponseDto.builder()
                .content(content)
                .pageInfo(pageInfo)
                .averageRating(averageRating)
                .build();
    }

    @Transactional
    public ReviewResponseDto createReview(Long userId, Long placeId, ReviewCreateRequestDto request) {
        if (reviewRepository.existsByPlaceIdAndUserId(placeId, userId)) {
            throw new DuplicateResourceException("해당 장소에 이미 리뷰를 작성했습니다.");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(UserNotFoundException::new);
        
        PlaceEntity place = placeRepository.findById(placeId)
                .orElseThrow(PlaceNotFoundException::new);

        ReviewEntity review = new ReviewEntity(
                place,
                user,
                request.rating(),
                request.content()
        );

        ReviewEntity savedReview = reviewRepository.save(review);
        return ReviewResponseDto.from(savedReview);
    }

    @Transactional
    public ReviewResponseDto updateReview(Long userId, Long placeId, Long reviewId, ReviewUpdateRequestDto request) {
        ReviewEntity review = reviewRepository.findByIdWithUser(reviewId)
                .orElseThrow(ReviewNotFoundException::new);

        if (!review.getPlace().getId().equals(placeId)) {
            throw new ReviewNotFoundException();
        }

        validateReviewOwnership(review, userId);

        review.update(request.rating(), request.content());
        
        return ReviewResponseDto.from(review);
    }

    @Transactional
    public void deleteReview(Long userId, Long placeId, Long reviewId) {
        ReviewEntity review = reviewRepository.findByIdWithUser(reviewId)
                .orElseThrow(ReviewNotFoundException::new);

        if (!review.getPlace().getId().equals(placeId)) {
            throw new ReviewNotFoundException();
        }

        validateReviewOwnership(review, userId);

        reviewRepository.delete(review);
    }

    private void validateReviewOwnership(ReviewEntity review, Long userId) {
        if (!review.getUser().getId().equals(userId)) {
            throw new ForbiddenException();
        }
    }
}
