package com.sulddara.server.user.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.user.dto.*;
import com.sulddara.server.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ResponseEntity<UserProfileResponseDto> getMyProfile(@AuthenticationPrincipal CustomOAuth2User user) {
        Long userId = user.getUserId();
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @PatchMapping
    public ResponseEntity<UserProfileResponseDto> updateMyProfile(
            @AuthenticationPrincipal CustomOAuth2User user,
            @Valid @RequestBody UserUpdateNameRequestDto requestDto) {
        Long userId = user.getUserId();
        return ResponseEntity.ok(userService.updateUserProfile(userId, requestDto));
    }

    @PostMapping("/preference")
    public ResponseEntity<UserPreferenceResponseDto> registerPreference(
            @AuthenticationPrincipal CustomOAuth2User user,
            @Valid @RequestBody UserPreferenceRequestDto requestDto) {
        Long userId = user.getUserId();
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(userService.registerOrUpdatePreference(userId, requestDto));
    }

    @PatchMapping("/preference")
    public ResponseEntity<UserPreferenceResponseDto> updatePreference(
            @AuthenticationPrincipal CustomOAuth2User user,
            @Valid @RequestBody UserPreferenceRequestDto requestDto) {
        Long userId = user.getUserId();
        return ResponseEntity.ok(userService.registerOrUpdatePreference(userId, requestDto));
    }

    @DeleteMapping
    public ResponseEntity<java.util.Map<String, Object>> withdrawUser(@AuthenticationPrincipal CustomOAuth2User user) {
        Long userId = user.getUserId();
        userService.deleteUser(userId);
        return ResponseEntity.ok(java.util.Map.of("ok", true, "message", "회원 탈퇴가 완료되었습니다."));
    }
}
