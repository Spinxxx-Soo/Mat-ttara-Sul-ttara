package com.sulddara.server.user.service.impl;

import com.sulddara.server.share.error.ErrorCode;
import com.sulddara.server.share.error.exception.BaseException;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.auth.jwt.OAuth2UserInfo;
import com.sulddara.server.user.dto.*;
import com.sulddara.server.user.domain.User;
import com.sulddara.server.user.domain.UserPreference;
import com.sulddara.server.user.repository.UserRepository;
import com.sulddara.server.user.mapper.UserMapper;
import com.sulddara.server.user.exception.UserNotFoundException;
import com.sulddara.server.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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

    @Transactional
    public UserAuthResultDto joinOrUpdate(OAuth2UserInfo userInfo) {
        if (userInfo.getProviderId() == null || userInfo.getProvider() == null) {
            throw new BaseException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return userRepository.findByProviderAndOauthId(
                        userInfo.getProvider().toString(),
                        userInfo.getProviderId()
                )
                .map(user -> {
                    user.changeName(userInfo.getName());
                    user.updateLastLoginAt(LocalDateTime.now());
                    return new UserAuthResultDto(user, false);
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .oauthId(userInfo.getProviderId())
                            .provider(userInfo.getProvider().toString())
                            .email(userInfo.getEmail())
                            .name(userInfo.getName())
                            .role("ROLE_USER")
                            .lastLoginAt(LocalDateTime.now())
                            .build();
                    return new UserAuthResultDto(userRepository.save(newUser), true);
                });
    }
}
