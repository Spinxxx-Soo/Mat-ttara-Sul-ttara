package com.sulddara.server.user.dto;

import com.sulddara.server.user.domain.User;

public record UserAuthResultDto(User user, boolean isNewUser) {}
