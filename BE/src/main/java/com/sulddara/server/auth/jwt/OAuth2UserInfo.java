package com.sulddara.server.auth.jwt;

import com.sulddara.server.user.domain.enums.SocialType;

public interface OAuth2UserInfo {
    SocialType getProvider();
    String getProviderId();
    String getEmail();
    String getName();
    String getProfileImage();
}
