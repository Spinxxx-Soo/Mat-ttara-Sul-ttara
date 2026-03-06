package com.sulddara.server.user.service;

import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

  private final UserRepository userRepository;

  public UserResponseDto getUserProfile(Long userId) {
    User user = getUserOrThrow(userId);
    return mapToResponseDto(user);
  }

  @Transactional
  public UserResponseDto updateUserName(Long userId, UserUpdateNameRequestDto requestDto) {
    User user = getUserOrThrow(userId);
    user.updateName(requestDto.getName());
    return mapToResponseDto(user);
  }

  @Transactional
  public UserResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto) {
    User user = getUserOrThrow(userId);

    if (user.getPreference() == null) {
      UserPreference newPreference = UserPreference.builder()
          .purpose(requestDto.getPurpose())
          .ageGroup(requestDto.getAgeGroup())
          .gender(requestDto.getGender())
          .build();
      user.setPreference(newPreference);
    } else {
      user.getPreference().updatePreferences(
          requestDto.getPurpose(),
          requestDto.getAgeGroup(),
          requestDto.getGender());
    }

    return mapToResponseDto(user);
  }

  @Transactional
  public void deleteUser(Long userId) {
    User user = getUserOrThrow(userId);
    userRepository.delete(user);
  }

  private User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
  }

  private UserResponseDto mapToResponseDto(User user) {
    UserPreference pref = user.getPreference();
    return new UserResponseDto(
        user.getId(),
        user.getOAuthId(),
        user.getName(),
        user.getRole(),
        pref != null ? pref.getPurpose() : null,
        pref != null ? pref.getAgeGroup() : null,
        pref != null ? pref.getGender() : null);
  }
}
