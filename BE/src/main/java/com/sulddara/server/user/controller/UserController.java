package com.sulddara.server.user.controller;

import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;
import com.sulddara.server.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  // TODO: Replace with Authentication Principal
  private Long getCurrentUserId() {
    return 1L;
  }

  @GetMapping
  public ResponseEntity<UserResponseDto> getMyProfile() {
    return ResponseEntity.ok(userService.getUserProfile(getCurrentUserId()));
  }

  @PatchMapping("/name")
  public ResponseEntity<UserResponseDto> updateMyName(
      @Valid @RequestBody UserUpdateNameRequestDto requestDto) {
    return ResponseEntity.ok(userService.updateUserName(getCurrentUserId(), requestDto));
  }

  @PostMapping("/preference")
  public ResponseEntity<UserResponseDto> registerPreference(
      @Valid @RequestBody UserPreferenceRequestDto requestDto) {
    return ResponseEntity.ok(userService.registerOrUpdatePreference(getCurrentUserId(), requestDto));
  }

  @PatchMapping("/preference")
  public ResponseEntity<UserResponseDto> updatePreference(
      @Valid @RequestBody UserPreferenceRequestDto requestDto) {
    return ResponseEntity.ok(userService.registerOrUpdatePreference(getCurrentUserId(), requestDto));
  }

  @DeleteMapping
  public ResponseEntity<Void> withdrawUser() {
    userService.deleteUser(getCurrentUserId());
    return ResponseEntity.noContent().build();
  }
}
