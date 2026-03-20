package com.sulddara.server.user.dto;

public record UserAuthResultDto(
    Long userId,
    String email,
    String role,
    boolean isNewUser
) {}
