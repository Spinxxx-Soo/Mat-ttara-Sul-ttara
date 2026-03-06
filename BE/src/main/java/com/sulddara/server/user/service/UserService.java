package com.sulddara.server.user.service;

import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;

public interface UserService {
  UserResponseDto getUserProfile(Long userId);

  UserResponseDto updateUserName(Long userId, UserUpdateNameRequestDto requestDto);

  UserResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto);

  void deleteUser(Long userId);
}
