package com.sulddara.server.user.service;

import com.sulddara.server.user.dto.*;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

  private static final String USER_NOT_FOUND_MSG = "User not found with id: ";

  private final UserRepository userRepository;

  @Override
  public UserProfileResponseDto getUserProfile(Long userId) {
    User user = getUserOrThrow(userId);
    return mapToProfileResponseDto(user);
  }

  @Override
  @Transactional
  public UserProfileResponseDto updateUserName(Long userId, UserUpdateNameRequestDto requestDto) {
    User user = getUserOrThrow(userId);
    user.updateName(requestDto.getName());
    return mapToProfileResponseDto(user);
  }

  @Override
  @Transactional
  public UserPreferenceResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto) {
    User user = getUserOrThrow(userId);

    if (user.getPreference() == null) {
      UserPreference newPreference = new UserPreference(
          requestDto.getPurpose(),
          requestDto.getAgeGroup(),
          requestDto.getGender());
      user.setPreference(newPreference);
    } else {
      user.getPreference().updatePreferences(
          requestDto.getPurpose(),
          requestDto.getAgeGroup(),
          requestDto.getGender());
    }

    return mapToPreferenceResponseDto(user.getPreference());
  }

  @Override
  @Transactional
  public void deleteUser(Long userId) {
    User user = getUserOrThrow(userId);
    userRepository.delete(user);
  }

  private User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException(USER_NOT_FOUND_MSG + userId));
  }

  private UserProfileResponseDto mapToProfileResponseDto(User user) {
    return UserProfileResponseDto.builder()
        .id(user.getId())
        .name(user.getName())
        .role(user.getRole())
        .build();
  }

  private UserPreferenceResponseDto mapToPreferenceResponseDto(UserPreference pref) {
    return UserPreferenceResponseDto.builder()
        .purpose(pref.getPurpose())
        .ageGroup(pref.getAgeGroup())
        .gender(pref.getGender())
        .build();
  }
}
