package com.sulddara.server.plan.controller;

import com.sulddara.server.plan.dto.PlanCreateRequestDto;
import com.sulddara.server.plan.dto.PlanCreateResponseDto;
import com.sulddara.server.plan.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/plans")
@RequiredArgsConstructor
public class PlanController {

  private final PlanService planService;

  // TODO: Replace with Authentication Principal
  private Long getCurrentUserId() {
    return 1L;
  }

  @PostMapping
  public ResponseEntity<PlanCreateResponseDto> createPlan(
      @Valid @RequestBody PlanCreateRequestDto requestDto) {
    PlanCreateResponseDto response = planService.createPlan(getCurrentUserId(), requestDto);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }
}
