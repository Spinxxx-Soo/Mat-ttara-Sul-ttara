package com.sulddara.server.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponseDto {
  private Long id;
  private String name;
  private String role;
}
