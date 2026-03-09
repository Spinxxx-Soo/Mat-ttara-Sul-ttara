package com.sulddara.server.user.service;

import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserPreferenceResponseDto;
import com.sulddara.server.user.dto.UserProfileResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;

public interface UserService {
  UserProfileResponseDto getUserProfile(Long userId);

  UserProfileResponseDto updateUserName(Long userId, UserUpdateNameRequestDto requestDto);

  UserPreferenceResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto);

  void deleteUser(Long userId);
}
