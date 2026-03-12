package com.sulddara.server.plan.service;

import com.sulddara.server.place.domain.Place;
import com.sulddara.server.place.repository.PlaceRepository;
import com.sulddara.server.plan.domain.Plan;
import com.sulddara.server.plan.domain.PlanDetail;
import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanListResponseDto;
import com.sulddara.server.plan.dto.PlanSummaryDto;
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
    Plan plan = planRepository.findWithDetailsByIdAndDeletedAtIsNull(planId)
        .orElseThrow(() -> new IllegalArgumentException("플랜을 찾을 수 없습니다."));

    if (!plan.getUser().getId().equals(userId)) {
      throw new IllegalArgumentException("접근 권한이 없는 플랜입니다.");
    }

    return planMapper.toDetailResponse(plan);
  }
}
