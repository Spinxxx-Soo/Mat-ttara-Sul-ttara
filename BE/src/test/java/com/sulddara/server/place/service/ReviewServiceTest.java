package com.sulddara.server.place.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.domain.ReviewEntity;
import com.sulddara.server.place.dto.ReviewCreateRequestDto;
import com.sulddara.server.place.dto.ReviewResponseDto;
import com.sulddara.server.place.dto.ReviewUpdateRequestDto;
import com.sulddara.server.place.exception.ReviewPermissionDeniedException;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.place.repository.ReviewRepository;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @InjectMocks
    private ReviewService reviewService;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("getReviews_validPlaceId_returnsReviewList")
    void getReviews_validPlaceId_returnsReviewList() {
        // given
        Long placeId = 1L;
        given(placeRepository.existsById(placeId)).willReturn(true);

        UserEntity user = new UserEntity("test@test.com", "testUser", "bio", "img", com.sulddara.server.user.domain.enums.SocialType.NAVER, "12345", "ROLE_USER");
        ReflectionTestUtils.setField(user, "id", 1L);
        PlaceEntity place = new PlaceEntity("NAVER", "ext1", "Place", "Addr", 37.0, 127.0);
        
        ReviewEntity review = new ReviewEntity(place, user, 5, "Great place!");
        ReflectionTestUtils.setField(review, "id", 100L);

        given(reviewRepository.findAllByPlaceIdOrderByCreatedAtDesc(placeId))
                .willReturn(List.of(review));

        // when
        List<ReviewResponseDto> result = reviewService.getReviews(placeId);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).rating()).isEqualTo(5);
        assertThat(result.get(0).content()).isEqualTo("Great place!");
    }

    @Test
    @DisplayName("createReview_validRequest_returnsCreatedDto")
    void createReview_validRequest_returnsCreatedDto() {
        // given
        Long userId = 1L;
        Long placeId = 2L;
        ReviewCreateRequestDto request = new ReviewCreateRequestDto(4, "Nice!");

        UserEntity user = new UserEntity("test@test.com", "tester", "bio", "img", com.sulddara.server.user.domain.enums.SocialType.NAVER, "123", "ROLE_USER");
        ReflectionTestUtils.setField(user, "id", userId);
        PlaceEntity place = new PlaceEntity("NAVER", "ext2", "Place2", "Addr2", 37.0, 127.0);
        ReflectionTestUtils.setField(place, "id", placeId);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(placeRepository.findById(placeId)).willReturn(Optional.of(place));

        ReviewEntity savedReview = new ReviewEntity(place, user, 4, "Nice!");
        ReflectionTestUtils.setField(savedReview, "id", 100L);
        given(reviewRepository.save(any(ReviewEntity.class))).willReturn(savedReview);

        // when
        ReviewResponseDto response = reviewService.createReview(userId, placeId, request);

        // then
        assertThat(response.rating()).isEqualTo(4);
        assertThat(response.content()).isEqualTo("Nice!");
        verify(reviewRepository).save(any(ReviewEntity.class));
    }

    @Test
    @DisplayName("updateReview_unauthorizedUser_throwsReviewPermissionDeniedException")
    void updateReview_unauthorizedUser_throwsReviewPermissionDeniedException() {
        // given
        Long ownerId = 1L;
        Long requesterId = 2L;
        Long placeId = 3L;
        Long reviewId = 10L;

        given(placeRepository.existsById(placeId)).willReturn(true);

        UserEntity owner = new UserEntity("o@test.com", "owner", "bio", "img", com.sulddara.server.user.domain.enums.SocialType.NAVER, "123", "ROLE_USER");
        ReflectionTestUtils.setField(owner, "id", ownerId);
        PlaceEntity place = new PlaceEntity("NAVER", "ext3", "Place3", "Addr3", 37.0, 127.0);

        ReviewEntity review = new ReviewEntity(place, owner, 5, "Original");
        ReflectionTestUtils.setField(review, "id", reviewId);

        given(reviewRepository.findById(reviewId)).willReturn(Optional.of(review));

        ReviewUpdateRequestDto request = new ReviewUpdateRequestDto(3, "Changed");

        // when & then
        assertThatThrownBy(() -> reviewService.updateReview(requesterId, placeId, reviewId, request))
                .isInstanceOf(ReviewPermissionDeniedException.class);
    }
}
