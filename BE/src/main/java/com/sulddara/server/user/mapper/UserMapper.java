package com.sulddara.server.user.mapper;

import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.domain.UserPreferenceEntity;
import com.sulddara.server.user.dto.UserPreferenceResponseDto;
import com.sulddara.server.user.dto.UserProfileResponseDto;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserProfileResponseDto toProfileResponse(UserEntity user) {
    if (user == null) {
      return null;
    }
    return UserProfileResponseDto.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .name(user.getName())
        .bio(user.getBio())
        .createdAt(user.getCreatedAt())
        .lastLoginAt(user.getLastLoginAt())
        .updatedAt(user.getUpdatedAt())
        .build();
  }

  public UserPreferenceResponseDto toPreferenceResponse(UserPreferenceEntity pref) {
    if (pref == null) {
      return null;
    }
    return UserPreferenceResponseDto.builder()
        .prefId(pref.getId())
        .userId(pref.getUser().getId())
        .usageType(pref.getUsageType())
        .ageGroup(pref.getAgeGroup())
        .gender(pref.getGender())
        .createdAt(pref.getCreatedAt())
        .updatedAt(pref.getUpdatedAt())
        .build();
  }
}

