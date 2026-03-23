package com.sulddara.server.plan.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.plan.domain.PlanEntity;
import com.sulddara.server.common.fixture.PlanEntityFixture;
import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.mapper.PlanMapper;
import com.sulddara.server.plan.repository.PlanRepository;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanSummaryDto;
import com.sulddara.server.plan.dto.PlanUpdateRequestDto;
import com.sulddara.server.global.error.exception.ForbiddenException;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.common.fixture.UserEntityFixture;
import org.springframework.test.util.ReflectionTestUtils;
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
    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlaceEntity place = new PlaceEntity("NAVER", "ext_1", "맛집", "서울시 강남구", 37.5, 127.0);
    ReflectionTestUtils.setField(place, "id", 10L);

    PlanCreateRequestDto requestDto = new PlanCreateRequestDto(
        "회식 플랜",
        LocalDateTime.of(2026, 3, 15, 18, 0),
        4,
        200000L,
        "회식",
        "강남역 근처",
        List.of(new PlanCreateRequestDto.PlanDetailRequestDto(10L, 1))
    );

    PlanCreateResponseDto expectedResponse = PlanCreateResponseDto.builder()
        .planId(100L)
        .title("회식 플랜")
        .shareToken("abc123")
        .shareUrl("/api/v1/plans/share/abc123")
        .createdAt(LocalDateTime.now())
        .build();

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(placeRepository.findById(10L)).willReturn(Optional.of(place));
    given(planRepository.save(any(PlanEntity.class))).willAnswer(invocation -> {
      PlanEntity saved = invocation.getArgument(0);
      ReflectionTestUtils.setField(saved, "id", 100L);
      return saved;
    });
    given(planMapper.toCreateResponse(any(PlanEntity.class))).willReturn(expectedResponse);

    // When
    PlanCreateResponseDto response = planService.createPlan(userId, requestDto);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(100L);
    assertThat(response.getTitle()).isEqualTo("회식 플랜");
    assertThat(response.getShareToken()).isNotNull();

    verify(planRepository).save(any(PlanEntity.class));
    verify(placeRepository).findById(10L);
  }

  @Test
  @DisplayName("플랜 생성 - details 없이 요청해도 정상 생성된다")
  void createPlan_noDetails_returnsCreatedPlan() {
    // Given
    Long userId = 1L;
    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanCreateRequestDto requestDto = new PlanCreateRequestDto(
        "간단 플랜",
        LocalDateTime.of(2026, 3, 20, 12, 0),
        2,
        null,
        null,
        null,
        null
    );

    PlanCreateResponseDto expectedResponse = PlanCreateResponseDto.builder()
        .planId(101L)
        .title("간단 플랜")
        .shareToken("def456")
        .build();

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(planRepository.save(any(PlanEntity.class))).willAnswer(invocation -> {
      PlanEntity saved = invocation.getArgument(0);
      ReflectionTestUtils.setField(saved, "id", 101L);
      return saved;
    });
    given(planMapper.toCreateResponse(any(PlanEntity.class))).willReturn(expectedResponse);

    // When
    PlanCreateResponseDto response = planService.createPlan(userId, requestDto);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(101L);

    verify(planRepository).save(any(PlanEntity.class));
    verify(placeRepository, never()).findById(anyLong());
  }

  // ========== createPlan 실패 케이스 ==========

  @Test
  @DisplayName("플랜 생성 - 존재하지 않는 사용자 ID면 UserNotFoundException 발생")
  void createPlan_userNotFound_throwsUserNotFoundException() {
    // Given
    Long invalidUserId = 999L;
    PlanCreateRequestDto requestDto = new PlanCreateRequestDto(
        "실패 플랜",
        LocalDateTime.of(2026, 3, 15, 18, 0),
        4,
        null,
        null,
        null,
        null
    );

    given(userRepository.findById(invalidUserId)).willReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> planService.createPlan(invalidUserId, requestDto))
        .isInstanceOf(UserNotFoundException.class)
        .hasMessageContaining(String.valueOf(invalidUserId));

    verify(planRepository, never()).save(any(PlanEntity.class));
  }

  @Test
  @DisplayName("플랜 생성 - 존재하지 않는 장소 ID면 IllegalArgumentException 발생")
  void createPlan_placeNotFound_throwsIllegalArgumentException() {
    // Given
    Long userId = 1L;
    Long invalidPlaceId = 999L;
    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanCreateRequestDto requestDto = new PlanCreateRequestDto(
        "장소 없는 플랜",
        LocalDateTime.of(2026, 3, 15, 18, 0),
        4,
        null,
        null,
        null,
        List.of(new PlanCreateRequestDto.PlanDetailRequestDto(invalidPlaceId, 1))
    );

    given(userRepository.findById(userId)).willReturn(Optional.of(user));
    given(placeRepository.findById(invalidPlaceId)).willReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> planService.createPlan(userId, requestDto))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining(String.valueOf(invalidPlaceId));

    verify(planRepository, never()).save(any(PlanEntity.class));
  }

  // ========== getMyPlans 테스트 ==========

  @Test
  @DisplayName("플랜 목록 조회 - 커서가 없는 경우 첫 페이지를 조회한다")
  void getMyPlans_noCursor_returnsFirstPage() {
    // Given
    Long userId = 1L;
    int size = 10;
    PageRequest pageRequest = PageRequest.of(0, size + 1);

    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanEntity plan1 = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan1, "id", 2L);
    PlanEntity plan2 = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan2, "id", 1L);

    List<PlanEntity> plans = List.of(plan1, plan2);

    // getMyPlans 테스트
    given(userRepository.existsById(userId)).willReturn(true);
    given(planRepository.findByUserIdOrderByIdDesc(userId, pageRequest))
        .willReturn(plans);
    given(planMapper.toSummary(any(PlanEntity.class))).willAnswer(invocation -> {
      PlanEntity p = invocation.getArgument(0);
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
    verify(planRepository).findByUserIdOrderByIdDesc(userId, pageRequest);
  }

  @Test
  @DisplayName("플랜 목록 조회 - 커서가 있는 경우 다음 페이지를 조회한다")
  void getMyPlans_withCursor_returnsNextPage() {
    // Given
    Long userId = 1L;
    Long cursor = 10L;
    int size = 1;
    PageRequest pageRequest = PageRequest.of(0, size + 1);

    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanEntity plan1 = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan1, "id", 9L);
    PlanEntity plan2 = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan2, "id", 8L);

    List<PlanEntity> plans = List.of(plan1, plan2);

    // getMyPlans cursor 테스트
    given(userRepository.existsById(userId)).willReturn(true);
    given(planRepository.findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, pageRequest))
        .willReturn(plans);
    given(planMapper.toSummary(any(PlanEntity.class))).willAnswer(invocation -> {
      PlanEntity p = invocation.getArgument(0);
      return PlanSummaryDto.builder()
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
    verify(planRepository).findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, pageRequest);
  }

  // ========== getPlanDetail 테스트 ==========

  @Test
  @DisplayName("플랜 상세 조회 - 유효한 요청 시 상세 정보를 반환한다")
  void getPlanDetail_validRequest_returnsDetail() {
    // Given
    Long userId = 1L;
    Long planId = 100L;

    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan, "id", planId);
    given(userRepository.existsById(userId)).willReturn(true);
    given(planRepository.findWithDetailsById(planId))
        .willReturn(Optional.of(plan));

    PlanDetailResponseDto expectedDto = PlanDetailResponseDto.builder()
        .planId(planId)
        .title("상세 플랜")
        .build();

    given(planMapper.toDetailResponse(plan)).willReturn(expectedDto);

    // When
    PlanDetailResponseDto response = planService.getPlanDetail(userId, planId);

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

    UserEntity owner = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(owner, "id", ownerUserId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(owner);
    ReflectionTestUtils.setField(plan, "id", planId);

    given(userRepository.existsById(requestUserId)).willReturn(true);
    given(planRepository.findWithDetailsById(planId))
        .willReturn(Optional.of(plan));

    // When & Then
    assertThatThrownBy(() -> planService.getPlanDetail(requestUserId, planId))
        .isInstanceOf(ForbiddenException.class);
  }

  // ========== getSharedPlanDetail 테스트 ==========

  @Test
  @DisplayName("공유 플랜 상세 조회 - 유효한 토큰 시 상세 정보를 반환한다")
  void getSharedPlanDetail_validToken_returnsDetail() {
    // Given
    String shareToken = "token123";
    Long planId = 100L;

    UserEntity owner = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(owner, "id", 1L);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(owner);
    ReflectionTestUtils.setField(plan, "id", planId);

    given(planRepository.findWithDetailsByShareToken(shareToken))
        .willReturn(Optional.of(plan));

    PlanDetailResponseDto expectedDto = PlanDetailResponseDto.builder()
        .planId(planId)
        .title("공유 플랜")
        .shareToken(shareToken)
        .build();

    given(planMapper.toDetailResponse(plan)).willReturn(expectedDto);

    // When
    PlanDetailResponseDto response = planService.getSharedPlanDetail(shareToken);

    // Then
    assertThat(response).isNotNull();
    assertThat(response.getPlanId()).isEqualTo(planId);
    assertThat(response.getTitle()).isEqualTo("공유 플랜");
    assertThat(response.getShareToken()).isEqualTo(shareToken);
  }

  @Test
  @DisplayName("공유 플랜 상세 조회 - 유효하지 않은 토큰 시 예외가 발생한다")
  void getSharedPlanDetail_invalidToken_throwsException() {
    // Given
    String invalidToken = "invalid";

    given(planRepository.findWithDetailsByShareToken(invalidToken))
        .willReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> planService.getSharedPlanDetail(invalidToken))
        .isInstanceOf(IllegalArgumentException.class);
  }

  // ========== updatePlan 테스트 ==========

  @Test
  @DisplayName("플랜 수정 - 유효한 요청 시 정보가 정상 수정된다")
  void updatePlan_validRequest_returnsUpdatedDetail() {
    // Given
    Long userId = 1L;
    Long planId = 100L;
    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan, "id", planId);

    PlanUpdateRequestDto requestDto = new PlanUpdateRequestDto(
        "수정 제목",
        LocalDateTime.now().plusDays(1),
        6,
        150000L,
        "수정타입",
        "수정메모",
        null
    );

    PlanDetailResponseDto expectedDto = PlanDetailResponseDto.builder()
        .planId(planId)
        .title("수정 제목")
        .build();

    given(userRepository.existsById(userId)).willReturn(true);
    given(planRepository.findWithDetailsById(planId)).willReturn(Optional.of(plan));
    given(planMapper.toDetailResponse(any(PlanEntity.class))).willReturn(expectedDto);

    // When
    PlanDetailResponseDto response = planService.updatePlan(userId, planId, requestDto);

    // Then
    assertThat(response.getTitle()).isEqualTo("수정 제목");
    verify(planRepository, never()).save(any()); // dirty checking으로 동작하므로 save 불필요
  }

  @Test
  @DisplayName("플랜 수정 - 타인의 플랜인 경우 ForbiddenException 발생")
  void updatePlan_unauthorized_throwsForbiddenException() {
    // Given
    Long requestUserId = 2L;
    Long ownerUserId = 1L;
    Long planId = 100L;

    UserEntity owner = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(owner, "id", ownerUserId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(owner);
    ReflectionTestUtils.setField(plan, "id", planId);

    given(userRepository.existsById(requestUserId)).willReturn(true);
    given(planRepository.findWithDetailsById(planId)).willReturn(Optional.of(plan));

    // When & Then
    assertThatThrownBy(() -> planService.updatePlan(requestUserId, planId, any()))
        .isInstanceOf(ForbiddenException.class);
  }

  // ========== deletePlan 테스트 ==========

  @Test
  @DisplayName("플랜 삭제 - 유효한 요청 시 soft delete가 수행된다")
  void deletePlan_validRequest_callsSoftDelete() {
    // Given
    Long userId = 1L;
    Long planId = 100L;
    UserEntity user = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(user, "id", userId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(user);
    ReflectionTestUtils.setField(plan, "id", planId);

    given(userRepository.existsById(userId)).willReturn(true);
    given(planRepository.findById(planId)).willReturn(Optional.of(plan));

    // When
    planService.deletePlan(userId, planId);

    // Then
    assertThat(plan.getDeletedAt()).isNotNull();
  }

  @Test
  @DisplayName("플랜 삭제 - 타인의 플랜인 경우 ForbiddenException 발생")
  void deletePlan_unauthorized_throwsForbiddenException() {
    // Given
    Long requestUserId = 2L;
    Long ownerUserId = 1L;
    Long planId = 100L;

    UserEntity owner = UserEntityFixture.createDefaultUser();
    ReflectionTestUtils.setField(owner, "id", ownerUserId);

    PlanEntity plan = PlanEntityFixture.createDefaultPlan(owner);

    given(userRepository.existsById(requestUserId)).willReturn(true);
    given(planRepository.findById(planId)).willReturn(Optional.of(plan));

    // When & Then
    assertThatThrownBy(() -> planService.deletePlan(requestUserId, planId))
        .isInstanceOf(ForbiddenException.class);
  }
}
