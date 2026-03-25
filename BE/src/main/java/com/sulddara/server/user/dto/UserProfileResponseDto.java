package com.sulddara.server.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserProfileResponseDto {
  private Long userId;
  private String email;
  private String name;
  private String profileImageUrl;
  private String bio;
  private LocalDateTime createdAt;
  private LocalDateTime lastLoginAt;
  private LocalDateTime updatedAt;
}
