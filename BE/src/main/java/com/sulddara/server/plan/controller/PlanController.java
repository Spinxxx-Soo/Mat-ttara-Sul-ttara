package com.sulddara.server.plan.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.dto.PlanDetailResponseDto;
import com.sulddara.server.plan.dto.PlanListResponseDto;
import com.sulddara.server.plan.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/plans")
@RequiredArgsConstructor
public class PlanController {

  private final PlanService planService;

  @PostMapping
  public ResponseEntity<PlanCreateResponseDto> createPlan(
      @AuthenticationPrincipal CustomOAuth2User user,
      @Valid @RequestBody PlanCreateRequestDto requestDto) {
    Long userId = user.getUserId();
    PlanCreateResponseDto response = planService.createPlan(userId, requestDto);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  public ResponseEntity<PlanListResponseDto> getMyPlans(
      @AuthenticationPrincipal CustomOAuth2User user,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "10") int size) {
    Long userId = user.getUserId();
    return ResponseEntity.ok(planService.getMyPlans(userId, cursor, size));
  }

  @GetMapping("/{planId}")
  public ResponseEntity<PlanDetailResponseDto> getPlanDetail(
      @AuthenticationPrincipal CustomOAuth2User user,
      @PathVariable Long planId) {
    Long userId = user.getUserId();
    return ResponseEntity.ok(planService.getPlanDetail(userId, planId));
  }
}
