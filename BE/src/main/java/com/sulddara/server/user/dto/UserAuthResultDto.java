package com.sulddara.server.user.dto;

import com.sulddara.server.user.domain.UserEntity;

public record UserAuthResultDto(UserEntity user, boolean isNewUser) {}
