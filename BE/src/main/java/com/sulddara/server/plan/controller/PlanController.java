package com.sulddara.server.plan.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.plan.dto.*;
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

    @PostMapping("/ai")
    public ResponseEntity<PlanCreateResponseDto> createPlanFromAi(
            @AuthenticationPrincipal CustomOAuth2User user,
            @RequestBody AiPlanCreateRequestDto requestDto
    ) {
        Long userId = user.getUserId();
        PlanCreateResponseDto response = planService.createPlanFromAi(userId, requestDto);
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

    @GetMapping("/share/{shareToken}")
    public ResponseEntity<PlanDetailResponseDto> getSharedPlanDetail(@PathVariable String shareToken) {
        return ResponseEntity.ok(planService.getSharedPlanDetail(shareToken));
    }

    @PatchMapping("/{planId}")
    public ResponseEntity<PlanDetailResponseDto> updatePlan(
            @AuthenticationPrincipal CustomOAuth2User user,
            @PathVariable Long planId,
            @Valid @RequestBody PlanUpdateRequestDto requestDto) {
        Long userId = user.getUserId();
        PlanDetailResponseDto response = planService.updatePlan(userId, planId, requestDto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{planId}")
    public ResponseEntity<Void> deletePlan(
            @AuthenticationPrincipal CustomOAuth2User user,
            @PathVariable Long planId) {
        Long userId = user.getUserId();
        planService.deletePlan(userId, planId);
        return ResponseEntity.noContent().build();
    }
}
