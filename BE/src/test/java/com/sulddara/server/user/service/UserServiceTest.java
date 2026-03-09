package com.sulddara.server.user.service;

import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserPreferenceResponseDto;
import com.sulddara.server.user.dto.UserProfileResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;
import com.sulddara.server.user.mapper.UserMapper;
import com.sulddara.server.user.repository.UserRepository;
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
    User user = new User("google_12345", "GOOGLE", "Test User", "test@google.com", "ROLE_USER");
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
    User user = new User("google_12345", "GOOGLE", "Old Name", "test@google.com", "ROLE_USER");
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
  void registerPreferenceTest() {
    // given
    User user = new User("test_oauth", "TEST", "Test User", "test@test.com", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    UserPreferenceRequestDto requestDto = new UserPreferenceRequestDto("ALONE", "20s", "MALE");

    UserPreferenceResponseDto expectedDto = UserPreferenceResponseDto.builder()
        .usageType("ALONE").ageGroup("20s").gender("MALE").build();

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));
    given(userMapper.toPreferenceResponse(any(UserPreference.class))).willReturn(expectedDto);

    // when
    UserPreferenceResponseDto response = userService.registerOrUpdatePreference(1L, requestDto);

    // then
    assertThat(response.getUsageType()).isEqualTo("ALONE");
    assertThat(user.getPreference()).isNotNull();
  }

  @Test
  @DisplayName("사용자 탈퇴 테스트")
  void deleteUserTest() {
    // given
    User user = new User("test_oauth", "TEST", "Test User", "test@test.com", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    userService.deleteUser(1L);

    // then
    Mockito.verify(userRepository).delete(user);
  }
}

