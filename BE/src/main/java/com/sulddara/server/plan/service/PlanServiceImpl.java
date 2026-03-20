package com.sulddara.server.plan.service;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.ForbiddenException;
import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.exception.PlaceNotFoundException;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.plan.domain.PlanEntity;
import com.sulddara.server.plan.domain.PlanDetailEntity;
import com.sulddara.server.plan.dto.*;
import com.sulddara.server.plan.exception.PlanNotFoundException;
import com.sulddara.server.plan.mapper.PlanMapper;
import com.sulddara.server.plan.repository.PlanRepository;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanServiceImpl implements PlanService {

  private final PlanRepository planRepository;
  private final PlaceRepository placeRepository;
  private final UserRepository userRepository;
  private final PlanMapper planMapper;

  @Override
  @Transactional
  public PlanCreateResponseDto createPlan(Long userId, PlanCreateRequestDto requestDto) {
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(UserNotFoundException::new);

    String shareToken = UUID.randomUUID().toString().replace("-", "");

    PlanEntity plan = new PlanEntity(
        user,
        requestDto.title(),
        requestDto.meetingAt(),
        requestDto.participantCount(),
        requestDto.totalBudget(),
        requestDto.planType(),
        requestDto.memo(),
        shareToken);

    if (requestDto.details() != null) {
      for (PlanCreateRequestDto.PlanDetailRequestDto detailDto : requestDto.details()) {
        Place place = placeRepository.findById(detailDto.placeId())
            .orElseThrow(PlaceNotFoundException::new);

        PlanDetailEntity detail = new PlanDetailEntity(place, detailDto.seqNo(), null);
        plan.addDetail(detail);
      }
    }

    PlanEntity savedPlan = planRepository.save(plan);
    return planMapper.toCreateResponse(savedPlan);
  }

  @Override
  public PlanListResponseDto getMyPlans(Long userId, Long cursor, int size) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException();
    }

    PageRequest pageRequest = PageRequest.of(0, size + 1);
    List<PlanEntity> plans;

    if (cursor == null) {
      plans = planRepository.findByUserIdOrderByIdDesc(userId, pageRequest);
    } else {
      plans = planRepository.findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, pageRequest);
    }

    boolean hasNext = plans.size() > size;
    List<PlanEntity> content = hasNext ? plans.subList(0, size) : plans;

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
      throw new UserNotFoundException();
    }

    PlanEntity plan = planRepository.findWithDetailsById(planId)
        .orElseThrow(PlanNotFoundException::new);

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return planMapper.toDetailResponse(plan);
  }

  @Override
  public PlanDetailResponseDto getSharedPlanDetail(String shareToken) {
    PlanEntity plan = planRepository.findWithDetailsByShareToken(shareToken)
        .orElseThrow(PlanNotFoundException::new);

    return planMapper.toDetailResponse(plan);
  }

  @Override
  @Transactional
  public PlanDetailResponseDto updatePlan(Long userId, Long planId, PlanUpdateRequestDto requestDto) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException();
    }

    PlanEntity plan = planRepository.findWithDetailsById(planId)
        .orElseThrow(PlanNotFoundException::new);

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    plan.update(
        requestDto.title(),
        requestDto.meetingAt(),
        requestDto.participantCount(),
        requestDto.totalBudget(),
        requestDto.planType(),
        requestDto.memo()
    );

    plan.getDetails().clear();

    if (requestDto.details() != null) {
      for (PlanUpdateRequestDto.PlanDetailUpdateRequestDto detailDto : requestDto.details()) {
        Place place = placeRepository.findById(detailDto.placeId())
            .orElseThrow(PlaceNotFoundException::new);
        PlanDetailEntity detail = new PlanDetailEntity(place, detailDto.seqNo(), detailDto.recommendReason());
        plan.addDetail(detail);
      }
    }

    return planMapper.toDetailResponse(plan);
  }

  @Override
  @Transactional
  public void deletePlan(Long userId, Long planId) {
    if (!userRepository.existsById(userId)) {
      throw new UserNotFoundException();
    }

    PlanEntity plan = planRepository.findById(planId)
        .orElseThrow(PlanNotFoundException::new);

    if (!plan.getUser().getId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    plan.softDelete();
  }
}
