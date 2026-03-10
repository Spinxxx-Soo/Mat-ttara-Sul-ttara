package com.sulddara.server.plan.service;

import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.plan.domain.Plan;
import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.mapper.PlanMapper;
import com.sulddara.server.plan.repository.PlanRepository;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PlanServiceImpl 유닛 테스트")
class PlanServiceImplTest {

  @Mock
  private PlanRepository planRepository;

  @Mock
  private PlaceRepository placeRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private PlanMapper planMapper;

  @InjectMocks
  private PlanServiceImpl planService;

  // ========== createPlan 성공 케이스 ==========

  @Test
  @DisplayName("플랜 생성 - 유효한 요청 시 플랜이 정상 생성된다")
  void createPlan_validRequest_returnsCreatedPlan() {
    // Given
    Long userId = 1L;
    User user = new User("google_123", "GOOGLE", "테스트유저", "test@test.com", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", userId);

    Place place = new Place("NAVER", "ext_1", "맛집", "서울시 강남구", 37.5, 127.0);
    ReflectionTestUtils.setField(place, "id", 10L);

    PlanCreateRequestDto requestDto = PlanCreateRequestDto.builder()
        .title("회식 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 15, 18, 0))
        .participantCount(4)
        .totalBudget(200000L)
        .planType("회식")
        .memo("강남역 근처")
        .details(List.of(
            PlanCreateRequestDto.PlanDetailRequestDto.builder()
                .placeId(10L)
                .seqNo(1)
                .build()))
        .build();

    PlanCreateResponseDto expectedResponse = PlanCreateResponseDto.builder()
        .planId(100L)
        .title("회식 플랜")
        .shareToken("abc123")
        .shareUrl("/api/v1/plans/share/abc123")
        .createdAt(LocalDateTime.now())
        .build();

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(placeRepository.findById(10L)).willReturn(Optional.of(place));
    given(planRepository.save(any(Plan.class))).willAnswer(invocation -> {
      Plan saved = invocation.getArgument(0);
      ReflectionTestUtils.setField(saved, "id", 100L);
      return saved;
    });
    given(planMapper.toCreateResponse(any(Plan.class))).willReturn(expectedResponse);

    // When
    PlanCreateResponseDto response = planService.createPlan(userId, requestDto);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(100L);
    assertThat(response.getTitle()).isEqualTo("회식 플랜");
    assertThat(response.getShareToken()).isNotNull();

    verify(planRepository).save(any(Plan.class));
    verify(placeRepository).findById(10L);
  }

  @Test
  @DisplayName("플랜 생성 - details 없이 요청해도 정상 생성된다")
  void createPlan_noDetails_returnsCreatedPlan() {
    // Given
    Long userId = 1L;
    User user = new User("google_123", "GOOGLE", "테스트유저", "test@test.com", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", userId);

    PlanCreateRequestDto requestDto = PlanCreateRequestDto.builder()
        .title("간단 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 20, 12, 0))
        .participantCount(2)
        .build();

    PlanCreateResponseDto expectedResponse = PlanCreateResponseDto.builder()
        .planId(101L)
        .title("간단 플랜")
        .shareToken("def456")
        .build();

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(planRepository.save(any(Plan.class))).willAnswer(invocation -> {
      Plan saved = invocation.getArgument(0);
      ReflectionTestUtils.setField(saved, "id", 101L);
      return saved;
    });
    given(planMapper.toCreateResponse(any(Plan.class))).willReturn(expectedResponse);

    // When
    PlanCreateResponseDto response = planService.createPlan(userId, requestDto);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(101L);

    verify(planRepository).save(any(Plan.class));
    verify(placeRepository, never()).findById(anyLong());
  }

  // ========== createPlan 실패 케이스 ==========

  @Test
  @DisplayName("플랜 생성 - 존재하지 않는 사용자 ID면 UserNotFoundException 발생")
  void createPlan_userNotFound_throwsUserNotFoundException() {
    // Given
    Long invalidUserId = 999L;
    PlanCreateRequestDto requestDto = PlanCreateRequestDto.builder()
        .title("실패 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 15, 18, 0))
        .participantCount(4)
        .build();

    given(userRepository.findById(invalidUserId)).willReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> planService.createPlan(invalidUserId, requestDto))
        .isInstanceOf(UserNotFoundException.class)
        .hasMessageContaining(String.valueOf(invalidUserId));

    verify(planRepository, never()).save(any(Plan.class));
  }

  @Test
  @DisplayName("플랜 생성 - 존재하지 않는 장소 ID면 IllegalArgumentException 발생")
  void createPlan_placeNotFound_throwsIllegalArgumentException() {
    // Given
    Long userId = 1L;
    Long invalidPlaceId = 999L;
    User user = new User("google_123", "GOOGLE", "테스트유저", "test@test.com", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", userId);

    PlanCreateRequestDto requestDto = PlanCreateRequestDto.builder()
        .title("장소 없는 플랜")
        .meetingAt(LocalDateTime.of(2026, 3, 15, 18, 0))
        .participantCount(4)
        .details(List.of(
            PlanCreateRequestDto.PlanDetailRequestDto.builder()
                .placeId(invalidPlaceId)
                .seqNo(1)
                .build()))
        .build();

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(placeRepository.findById(invalidPlaceId)).willReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> planService.createPlan(userId, requestDto))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining(String.valueOf(invalidPlaceId));

    verify(planRepository, never()).save(any(Plan.class));
  }
}
