package com.sulddara.server.place.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.domain.ReviewEntity;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.ReviewListResponseDto;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;

    public ReviewListResponseDto getReviews(Long placeId, int page, int size) {
        PlaceEntity place = placeRepository.findById(placeId)
                .orElseThrow(PlaceNotFoundException::new);

        Pageable pageable = PageRequest.of(page - 1, size);
        Page<ReviewEntity> reviewPage = reviewRepository.findAllByPlaceIdOrderByCreatedAtDesc(placeId, pageable);
        
        List<ReviewResponseDto> content = reviewPage.getContent().stream()
                .map(ReviewResponseDto::from)
                .toList();

        ReviewListResponseDto.PageInfoDto pageInfo = ReviewListResponseDto.PageInfoDto.builder()
                .page(page)
                .size(size)
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .hasNext(reviewPage.hasNext())
                .build();

        Double averageRating = placeRepository.getAverageRatingByPlaceId(placeId);

        return ReviewListResponseDto.builder()
                .content(content)
                .pageInfo(pageInfo)
                .averageRating(averageRating != null ? averageRating : 0.0)
                .build();
    }

    @Transactional
    public ReviewResponseDto createReview(Long userId, Long placeId, ReviewCreateRequestDto request) {
        Optional<ReviewEntity> deletedReview = reviewRepository.findByPlaceIdAndUserIdIncludeDeleted(placeId, userId);

        if (deletedReview.isPresent()) {
            ReviewEntity review = deletedReview.get();
            if (review.getDeletedAt() == null) {
                throw new DuplicateResourceException("해당 장소에 이미 리뷰를 작성했습니다.");
            }
            review.restore(request.rating(), request.content());
            ReviewEntity restored = reviewRepository.save(review);
            return ReviewResponseDto.from(restored);
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
