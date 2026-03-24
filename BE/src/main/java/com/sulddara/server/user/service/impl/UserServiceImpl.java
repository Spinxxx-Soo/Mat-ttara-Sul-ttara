package com.sulddara.server.user.service.impl;

import com.sulddara.server.global.error.ErrorCode;
import com.sulddara.server.global.error.exception.BaseException;
import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.auth.jwt.OAuth2UserInfo;
import com.sulddara.server.user.dto.*;
import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.domain.UserPreferenceEntity;
import com.sulddara.server.user.domain.enums.SocialType;
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

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public UserProfileResponseDto getUserProfile(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        return userMapper.toProfileResponse(user);
    }

    @Override
    @Transactional
    public UserProfileResponseDto updateUserProfile(Long userId, UserUpdateNameRequestDto requestDto) {
        UserEntity user = getUserOrThrow(userId);
        user.updateName(requestDto.name());
        user.updateBio(requestDto.bio());
        return userMapper.toProfileResponse(user);
    }

    @Override
    public UserPreferenceResponseDto getUserPreference(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        return userMapper.toPreferenceResponse(user.getPreference());
    }

    @Override
    @Transactional
    public UserPreferenceResponseDto registerOrUpdatePreference(Long userId, UserPreferenceRequestDto requestDto) {
        UserEntity user = getUserOrThrow(userId);

        if (user.getPreference() == null) {
            UserPreferenceEntity newPreference = new UserPreferenceEntity(
                    requestDto.usageType(),
                    requestDto.ageGroup(),
                    requestDto.gender());
            user.updatePreference(newPreference);
        } else {
            user.getPreference().updatePreferences(
                    requestDto.usageType(),
                    requestDto.ageGroup(),
                    requestDto.gender());
        }

        return userMapper.toPreferenceResponse(user.getPreference());
    }

    @Override
    @Transactional
    public void deleteUser(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        userRepository.delete(user);
    }

    private UserEntity getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(UserNotFoundException::new);
    }

    @Transactional
    public UserAuthResultDto joinOrUpdate(OAuth2UserInfo userInfo) {
        if (userInfo.getProviderId() == null || userInfo.getProvider() == null) {
            throw new BaseException(ErrorCode.INVALID_INPUT_VALUE);
        }
        SocialType socialType = SocialType.valueOf(userInfo.getProvider().toString().toUpperCase());
        return userRepository.findByProviderAndProviderId(
                        socialType,
                        userInfo.getProviderId()
                )
                .map(user -> {
                    user.updateName(userInfo.getName());
                    user.updateLastLoginAt(LocalDateTime.now());
                    return new UserAuthResultDto(
                            user.getId(),
                            user.getEmail(),
                            user.getRole(),
                            false
                    );
                })
                .orElseGet(() -> {
                    UserEntity newUser = new UserEntity(
                            userInfo.getEmail(),
                            userInfo.getName(),
                            null,
                            null,
                            socialType,
                            userInfo.getProviderId(),
                            "ROLE_USER"
                    );
                    newUser.updateLastLoginAt(LocalDateTime.now());
                    UserEntity savedUser = userRepository.save(newUser);
                    return new UserAuthResultDto(
                            savedUser.getId(),
                            savedUser.getEmail(),
                            savedUser.getRole(),
                            true
                    );
                });
    }
}
