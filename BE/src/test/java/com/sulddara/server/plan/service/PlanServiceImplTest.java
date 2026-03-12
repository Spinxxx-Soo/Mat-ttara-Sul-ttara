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
import org.springframework.data.domain.PageRequest;

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
    User user = User.builder()
        .oauthId("google_123")
        .provider("GOOGLE")
        .name("테스트유저")
        .email("test@test.com")
        .role("ROLE_USER")
        .build();
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
    User user = User.builder()
        .oauthId("google_123")
        .provider("GOOGLE")
        .name("테스트유저")
        .email("test@test.com")
        .role("ROLE_USER")
        .build();
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
    User user = User.builder()
        .oauthId("google_123")
        .provider("GOOGLE")
        .name("테스트유저")
        .email("test@test.com")
        .role("ROLE_USER")
        .build();
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

  // ========== getMyPlans 테스트 ==========

  @Test
  @DisplayName("플랜 목록 조회 - 커서가 없는 경우 첫 페이지를 조회한다")
  void getMyPlans_noCursor_returnsFirstPage() {
    // Given
    Long userId = 1L;
    int size = 10;
    PageRequest pageRequest = PageRequest.of(0, size + 1);

    User user = User.builder().build();
    ReflectionTestUtils.setField(user, "id", userId);

    Plan plan1 = new Plan(user, "플랜1", 10000L, 4, LocalDateTime.now(), "타입", "메모", "token1");
    ReflectionTestUtils.setField(plan1, "id", 2L);
    Plan plan2 = new Plan(user, "플랜2", 20000L, 4, LocalDateTime.now(), "타입", "메모", "token2");
    ReflectionTestUtils.setField(plan2, "id", 1L);

    List<Plan> plans = List.of(plan1, plan2);

    given(planRepository.findByUserIdAndDeletedAtIsNullOrderByIdDesc(userId, pageRequest))
        .willReturn(plans);
    given(planMapper.toSummary(any(Plan.class))).willAnswer(invocation -> {
      Plan p = invocation.getArgument(0);
      return com.sulddara.server.plan.dto.PlanSummaryDto.builder()
          .planId(p.getId())
          .title(p.getTitle())
          .build();
    });

    // When
    com.sulddara.server.plan.dto.PlanListResponseDto response = planService.getMyPlans(userId, null, size);

    // Then
    assertThat(response.getContent()).hasSize(2);
    assertThat(response.isHasNext()).isFalse();
    assertThat(response.getNextCursor()).isNull();
    verify(planRepository).findByUserIdAndDeletedAtIsNullOrderByIdDesc(userId, pageRequest);
  }

  @Test
  @DisplayName("플랜 목록 조회 - 커서가 있는 경우 다음 페이지를 조회한다")
  void getMyPlans_withCursor_returnsNextPage() {
    // Given
    Long userId = 1L;
    Long cursor = 10L;
    int size = 1;
    PageRequest pageRequest = PageRequest.of(0, size + 1);

    User user = User.builder().build();
    ReflectionTestUtils.setField(user, "id", userId);

    Plan plan1 = new Plan(user, "플랜1", 10000L, 4, LocalDateTime.now(), "타입", "메모", "token1");
    ReflectionTestUtils.setField(plan1, "id", 9L);
    Plan plan2 = new Plan(user, "플랜2", 20000L, 4, LocalDateTime.now(), "타입", "메모", "token2");
    ReflectionTestUtils.setField(plan2, "id", 8L);

    List<Plan> plans = List.of(plan1, plan2);

    given(planRepository.findByUserIdAndIdLessThanAndDeletedAtIsNullOrderByIdDesc(userId, cursor, pageRequest))
        .willReturn(plans);
    given(planMapper.toSummary(any(Plan.class))).willAnswer(invocation -> {
      Plan p = invocation.getArgument(0);
      return com.sulddara.server.plan.dto.PlanSummaryDto.builder()
          .planId(p.getId())
          .title(p.getTitle())
          .build();
    });

    // When
    com.sulddara.server.plan.dto.PlanListResponseDto response = planService.getMyPlans(userId, cursor, size);

    // Then
    assertThat(response.getContent()).hasSize(1);
    assertThat(response.getContent().get(0).getPlanId()).isEqualTo(9L);
    assertThat(response.isHasNext()).isTrue();
    assertThat(response.getNextCursor()).isEqualTo(9L);
    verify(planRepository).findByUserIdAndIdLessThanAndDeletedAtIsNullOrderByIdDesc(userId, cursor, pageRequest);
  }

  // ========== getPlanDetail 테스트 ==========

  @Test
  @DisplayName("플랜 상세 조회 - 유효한 요청 시 상세 정보를 반환한다")
  void getPlanDetail_validRequest_returnsDetail() {
    // Given
    Long userId = 1L;
    Long planId = 100L;

    User user = User.builder().build();
    ReflectionTestUtils.setField(user, "id", userId);

    Plan plan = new Plan(user, "상세 플랜", 10000L, 4, LocalDateTime.now(), "타입", "메모", "token1");
    ReflectionTestUtils.setField(plan, "id", planId);

    com.sulddara.server.plan.dto.PlanDetailResponseDto expectedDto = com.sulddara.server.plan.dto.PlanDetailResponseDto.builder()
        .planId(planId)
        .title("상세 플랜")
        .build();

    given(planRepository.findWithDetailsByIdAndDeletedAtIsNull(planId))
        .willReturn(Optional.of(plan));
    given(planMapper.toDetailResponse(plan)).willReturn(expectedDto);

    // When
    com.sulddara.server.plan.dto.PlanDetailResponseDto response = planService.getPlanDetail(userId, planId);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(planId);
    assertThat(response.getTitle()).isEqualTo("상세 플랜");
  }

  @Test
  @DisplayName("플랜 상세 조회 - 권한이 없는 경우 예외가 발생한다")
  void getPlanDetail_unauthorized_throwsException() {
    // Given
    Long requestUserId = 2L;
    Long ownerUserId = 1L;
    Long planId = 100L;

    User owner = User.builder().build();
    ReflectionTestUtils.setField(owner, "id", ownerUserId);

    Plan plan = new Plan(owner, "상세 플랜", 10000L, 4, LocalDateTime.now(), "타입", "메모", "token1");
    ReflectionTestUtils.setField(plan, "id", planId);

    given(planRepository.findWithDetailsByIdAndDeletedAtIsNull(planId))
        .willReturn(Optional.of(plan));

    // When & Then
    assertThatThrownBy(() -> planService.getPlanDetail(requestUserId, planId))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("접근 권한이 없는 플랜입니다.");
  }
}
