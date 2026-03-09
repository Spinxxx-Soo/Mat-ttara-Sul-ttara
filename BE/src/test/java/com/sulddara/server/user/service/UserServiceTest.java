package com.sulddara.server.user.service;

import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.dto.UserPreferenceRequestDto;
import com.sulddara.server.user.dto.UserPreferenceResponseDto;
import com.sulddara.server.user.dto.UserProfileResponseDto;
import com.sulddara.server.user.dto.UserUpdateNameRequestDto;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock
  private UserRepository userRepository;

  @InjectMocks
  private UserServiceImpl userService;

  @Test
  @DisplayName("사용자 프로필 조회 테스트")
  void getUserProfileTest() {
    // given
    User user = new User("google_12345", "GOOGLE", "Test User", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    UserProfileResponseDto response = userService.getUserProfile(1L);

    // then
    assertThat(response.getName()).isEqualTo("Test User");
  }

  @Test
  @DisplayName("사용자 이름 변경 테스트")
  void updateUserNameTest() {
    // given
    User user = new User("google_12345", "GOOGLE", "Old Name", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    UserUpdateNameRequestDto requestDto = new UserUpdateNameRequestDto("New Name");

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    UserProfileResponseDto response = userService.updateUserName(1L, requestDto);

    // then
    assertThat(response.getName()).isEqualTo("New Name");
    assertThat(user.getName()).isEqualTo("New Name");
  }

  @Test
  @DisplayName("온보딩 선호도 등록 테스트 (최초)")
  void registerPreferenceTest() {
    // given
    User user = new User("test_oauth", "TEST", "Test User", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    UserPreferenceRequestDto requestDto = new UserPreferenceRequestDto("ALONE", "20s", "MALE");

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    UserPreferenceResponseDto response = userService.registerOrUpdatePreference(1L, requestDto);

    // then
    assertThat(response.getPurpose()).isEqualTo("ALONE");
    assertThat(user.getPreference()).isNotNull();
  }

  @Test
  @DisplayName("사용자 탈퇴 테스트")
  void deleteUserTest() {
    // given
    User user = new User("test_oauth", "TEST", "Test User", "ROLE_USER");
    ReflectionTestUtils.setField(user, "id", 1L);

    given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

    // when
    userService.deleteUser(1L);

    // then
    Mockito.verify(userRepository).delete(user);
  }
}
