package com.sulddara.server.user.service;

import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserPreferenceResponseDto;
import com.sulddara.server.user.dto.UserProfileResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;
import com.sulddara.server.user.mapper.UserMapper;
import com.sulddara.server.user.repository.UserRepository;
import com.sulddara.server.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserMapper userMapper;

  @InjectMocks
  private UserServiceImpl userService;

  @Test
  @DisplayName("사용자 프로필 조회 테스트")
  void getUserProfileTest() {
    // given
    User user = User.builder()
            .oauthId("google_12345")
            .provider("GOOGLE")
            .name("Test User")
            .email("test@google.com")
            .bio("Hello, I'm a test user")
            .role("ROLE_USER")
            .build();
    ReflectionTestUtils.setField(user, "id", 1L);

    UserProfileResponseDto expectedDto = UserProfileResponseDto.builder()
        .userId(1L).name("Test User").email("test@google.com").build();

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));
    given(userMapper.toProfileResponse(any(User.class))).willReturn(expectedDto);

    // when
    UserProfileResponseDto response = userService.getUserProfile(1L);

    // then
    assertThat(response.getName()).isEqualTo("Test User");
  }

  @Test
  @DisplayName("사용자 프로필 수정 테스트")
  void updateUserProfileTest() {
    // given
    User user = User.builder()
            .oauthId("google_12345")
            .provider("GOOGLE")
            .name("Old Name")
            .email("test@google.com")
            .bio("Hello, I'm a test user")
            .role("ROLE_USER")
            .build();
    ReflectionTestUtils.setField(user, "id", 1L);

    UserUpdateNameRequestDto requestDto = new UserUpdateNameRequestDto("New Name", "Hello!");

    UserProfileResponseDto expectedDto = UserProfileResponseDto.builder()
        .userId(1L).name("New Name").bio("Hello!").email("test@google.com").build();

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));
    given(userMapper.toProfileResponse(any(User.class))).willReturn(expectedDto);

    // when
    UserProfileResponseDto response = userService.updateUserProfile(1L, requestDto);

    // then
    assertThat(response.getName()).isEqualTo("New Name");
    assertThat(user.getName()).isEqualTo("New Name");
    assertThat(user.getBio()).isEqualTo("Hello!");
  }

  @Test
  @DisplayName("온보딩 선호도 등록 테스트 (최초)")
  void registerOrUpdatePreference_newPreference_createsPreference() {
    // given
    User user = User.builder()
        .oauthId("test_oauth")
        .provider("TEST")
        .name("Test User")
        .email("test@test.com")
        .bio("Hello, I'm a test user")
        .role("ROLE_USER")
        .build();
    ReflectionTestUtils.setField(user, "id", 1L);

    UserPreferenceRequestDto requestDto = new UserPreferenceRequestDto("사적", "20대", "남성");

    UserPreferenceResponseDto expectedDto = UserPreferenceResponseDto.builder()
        .usageType("사적").ageGroup("20대").gender("남성").build();

    given(userRepository.findById(1L)).willReturn(Optional.of(user));
    given(userMapper.toPreferenceResponse(any(UserPreference.class))).willReturn(expectedDto);

    // when
    UserPreferenceResponseDto response = userService.registerOrUpdatePreference(1L, requestDto);

    // then
    assertThat(response.getUsageType()).isEqualTo("사적");
    assertThat(user.getPreference()).isNotNull();
    assertThat(user.getPreference().getUsageType()).isEqualTo("사적");
  }

  @Test
  @DisplayName("온보딩 선호도 수정 테스트 (기존 존재)")
  void registerOrUpdatePreference_existingPreference_updatesPreference() {
    // given
    User user = User.builder()
        .oauthId("test_oauth")
        .provider("TEST")
        .name("Test User")
        .email("test@test.com")
        .role("ROLE_USER")
        .build();
    ReflectionTestUtils.setField(user, "id", 1L);
    UserPreference oldPreference = new UserPreference("사적", "20대", "남성");
    user.setPreference(oldPreference);

    UserPreferenceRequestDto updateDto = new UserPreferenceRequestDto("공적", "30대", "여성");

    UserPreferenceResponseDto expectedDto = UserPreferenceResponseDto.builder()
        .usageType("공적").ageGroup("30대").gender("여성").build();

    given(userRepository.findById(1L)).willReturn(Optional.of(user));
    given(userMapper.toPreferenceResponse(any(UserPreference.class))).willReturn(expectedDto);

    // when
    UserPreferenceResponseDto response = userService.registerOrUpdatePreference(1L, updateDto);

    // then
    assertThat(response.getUsageType()).isEqualTo("공적");
    assertThat(user.getPreference().getUsageType()).isEqualTo("공적");
    assertThat(user.getPreference().getAgeGroup()).isEqualTo("30대");
  }

  @Test
  @DisplayName("사용자 탈퇴 테스트")
  void deleteUserTest() {
    // given
    User user = User.builder()
            .oauthId("test_oauth")
            .provider("TEST")
            .name("Test User")
            .email("test@test.com")
            .bio("Hello, I'm a test user")
            .role("ROLE_USER")
            .build();
    ReflectionTestUtils.setField(user, "id", 1L);

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    userService.deleteUser(1L);

    // then
    Mockito.verify(userRepository).delete(user);
  }
}
