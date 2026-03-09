package com.sulddara.server.user.service;

import com.sulddara.server.user.dto.*;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.repository.UserRepository;
import com.sulddara.server.user.mapper.UserMapper;
import com.sulddara.server.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

  private static final String USER_NOT_FOUND_MSG = "User not found with id: ";

  private final UserRepository userRepository;
  private final UserMapper userMapper;

  @Override
  public UserProfileResponseDto getUserProfile(Long userId) {
    User user = getUserOrThrow(userId);
    return userMapper.toProfileResponse(user);
  }

  @Override
  @Transactional
  public UserProfileResponseDto updateUserProfile(Long userId, UserUpdateNameRequestDto requestDto) {
    User user = getUserOrThrow(userId);
    user.updateProfile(requestDto.getName(), requestDto.getBio());
    return userMapper.toProfileResponse(user);
  }

  @Override
  @Transactional
  public UserPreferenceResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto) {
    User user = getUserOrThrow(userId);

    if (user.getPreference() == null) {
      UserPreference newPreference = new UserPreference(
          requestDto.getUsageType(),
          requestDto.getAgeGroup(),
          requestDto.getGender());
      user.setPreference(newPreference);
    } else {
      user.getPreference().updatePreferences(
          requestDto.getUsageType(),
          requestDto.getAgeGroup(),
          requestDto.getGender());
    }

    return userMapper.toPreferenceResponse(user.getPreference());
  }

  @Override
  @Transactional
  public void deleteUser(Long userId) {
    User user = getUserOrThrow(userId);
    userRepository.delete(user);
  }

  private User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + userId));
  }
}
