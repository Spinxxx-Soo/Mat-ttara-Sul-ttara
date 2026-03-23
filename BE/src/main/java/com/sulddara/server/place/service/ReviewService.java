package com.sulddara.server.place.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.domain.ReviewEntity;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.ReviewResponseDto;
import com.sulddara.server.place.dto.ReviewUpdateRequestDto;
import com.sulddara.server.place.exception.PlaceNotFoundException;
import com.sulddara.server.place.exception.ReviewNotFoundException;
import com.sulddara.server.place.exception.ReviewPermissionDeniedException;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.ReviewRepository;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;

    public List<ReviewResponseDto> getReviews(Long placeId) {
        if (!placeRepository.existsById(placeId)) {
            throw new PlaceNotFoundException();
        }

        return reviewRepository.findAllByPlaceIdOrderByCreatedAtDesc(placeId)
                .stream()
                .map(ReviewResponseDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReviewResponseDto createReview(Long userId, Long placeId, ReviewCreateRequestDto request) {
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
        if (!placeRepository.existsById(placeId)) {
            throw new PlaceNotFoundException();
        }

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(ReviewNotFoundException::new);

        validateReviewOwnership(review, userId);

        review.update(request.rating(), request.content());
        
        return ReviewResponseDto.from(review);
    }

    @Transactional
    public void deleteReview(Long userId, Long placeId, Long reviewId) {
        if (!placeRepository.existsById(placeId)) {
            throw new PlaceNotFoundException();
        }

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(ReviewNotFoundException::new);

        validateReviewOwnership(review, userId);

        review.softDelete();
    }

    private void validateReviewOwnership(ReviewEntity review, Long userId) {
        if (!review.getUser().getId().equals(userId)) {
            throw new ReviewPermissionDeniedException();
        }
    }
}
