package com.sulddara.server.plan.service;

import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.ForbiddenException;

import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.plan.domain.Plan;
import com.sulddara.server.plan.domain.PlanDetail;
import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanListResponseDto;
import com.sulddara.server.plan.dto.PlanSummaryDto;
import com.sulddara.server.plan.dto.PlanUpdateRequestDto;
import com.sulddara.server.plan.mapper.PlanMapper;
import com.sulddara.server.plan.repository.PlanRepository;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanServiceImpl implements PlanService {

  private static final String USER_NOT_FOUND_MSG = "사용자를 찾을 수 없습니다. ID: ";
  private static final String PLACE_NOT_FOUND_MSG = "장소를 찾을 수 없습니다. ID: ";
  private static final String PLAN_NOT_FOUND_MSG = "플랜을 찾을 수 없습니다.";

  private final PlanRepository planRepository;
  private final PlaceRepository placeRepository;
  private final UserRepository userRepository;
  private final PlanMapper planMapper;

  @Override
  @Transactional
  public PlanCreateResponseDto createPlan(Long userId, PlanCreateRequestDto requestDto) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + userId));

    String shareToken = UUID.randomUUID().toString().replace("-", "");

    Plan plan = new Plan(
        user,
        requestDto.getTitle(),
        requestDto.getTotalBudget(),
        requestDto.getParticipantCount(),
        requestDto.getMeetingAt(),
        requestDto.getPlanType(),
        requestDto.getMemo(),
        shareToken);

    if (requestDto.getDetails() != null) {
      for (PlanCreateRequestDto.PlanDetailRequestDto detailDto : requestDto.getDetails()) {
        Place place = placeRepository.findById(detailDto.getPlaceId())
            .orElseThrow(() -> new IllegalArgumentException(PLACE_NOT_FOUND_MSG + detailDto.getPlaceId()));


        PlanDetail detail = new PlanDetail(place, detailDto.getSeqNo(), null);
        plan.addDetail(detail);
      }
    }

    Plan savedPlan = planRepository.save(plan);
    return planMapper.toCreateResponse(savedPlan);
  }

  @Override
  public PlanListResponseDto getMyPlans(Long userId, Long cursor, int size) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException(USER_NOT_FOUND_MSG + userId);
    }

    PageRequest pageRequest = PageRequest.of(0, size + 1);
    List<Plan> plans;

    if (cursor == null) {
      plans = planRepository.findByUserIdAndDeletedAtIsNullOrderByIdDesc(userId, pageRequest);
    } else {
      plans = planRepository.findByUserIdAndIdLessThanAndDeletedAtIsNullOrderByIdDesc(userId, cursor, pageRequest);
    }

    boolean hasNext = plans.size() > size;
    List<Plan> content = hasNext ? plans.subList(0, size) : plans;

    List<PlanSummaryDto> dtos = content.stream()
        .map(planMapper::toSummary)
        .toList();

    Long nextCursor = null;
    if (hasNext && !content.isEmpty()) {
      nextCursor = content.get(content.size() - 1).getId();
    }

    return PlanListResponseDto.builder()
        .content(dtos)
        .nextCursor(nextCursor)
        .hasNext(hasNext)
        .build();
  }

  @Override
  public PlanDetailResponseDto getPlanDetail(Long userId, Long planId) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException(USER_NOT_FOUND_MSG + userId);
    }

    Plan plan = planRepository.findWithDetailsByIdAndDeletedAtIsNull(planId)
        .orElseThrow(() -> new IllegalArgumentException(PLAN_NOT_FOUND_MSG));

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return planMapper.toDetailResponse(plan);
  }

  @Override
  public PlanDetailResponseDto getSharedPlanDetail(String shareToken) {
    Plan plan = planRepository.findWithDetailsByShareTokenAndDeletedAtIsNull(shareToken)
        .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 삭제된 공유 링크입니다."));

    return planMapper.toDetailResponse(plan);
  }

  @Override
  @Transactional
  public PlanDetailResponseDto updatePlan(Long userId, Long planId, PlanUpdateRequestDto requestDto) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException(USER_NOT_FOUND_MSG + userId);
    }

    Plan plan = planRepository.findWithDetailsByIdAndDeletedAtIsNull(planId)
        .orElseThrow(() -> new IllegalArgumentException(PLAN_NOT_FOUND_MSG));

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    plan.update(
        requestDto.getTitle(),
        requestDto.getMeetingAt(),
        requestDto.getParticipantCount(),
        requestDto.getTotalBudget(),
        requestDto.getPlanType(),
        requestDto.getMemo()
    );

    plan.getDetails().clear();

    if (requestDto.getDetails() != null) {
      for (PlanUpdateRequestDto.PlanDetailUpdateRequestDto detailDto : requestDto.getDetails()) {
        Place place = placeRepository.findById(detailDto.getPlaceId())
            .orElseThrow(() -> new IllegalArgumentException(PLACE_NOT_FOUND_MSG + detailDto.getPlaceId()));
        PlanDetail detail = new PlanDetail(place, detailDto.getSeqNo(), detailDto.getRecommendReason());
        plan.addDetail(detail);
      }
    }

    return planMapper.toDetailResponse(plan);
  }

  @Override
  @Transactional
  public void deletePlan(Long userId, Long planId) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException(USER_NOT_FOUND_MSG + userId);
    }

    Plan plan = planRepository.findByIdAndDeletedAtIsNull(planId)
        .orElseThrow(() -> new IllegalArgumentException(PLAN_NOT_FOUND_MSG));

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    plan.softDelete();
  }
}
