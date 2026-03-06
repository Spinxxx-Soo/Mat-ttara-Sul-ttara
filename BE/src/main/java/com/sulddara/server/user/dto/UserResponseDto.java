package com.sulddara.server.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
  private Long id;
  private String oAuthId;
  private String name;
  private String role;
  private String purpose;
  private String ageGroup;
  private String gender;
}
