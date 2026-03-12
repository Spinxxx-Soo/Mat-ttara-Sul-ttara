package com.sulddara.server.auth.oauth;

import lombok.Getter;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

@Getter
public class CustomOAuth2User extends DefaultOAuth2User {

    private final Long userId;
    private final String email;
    private final String role;

    public CustomOAuth2User(OAuth2User oAuth2User,
                            Long userId,
                            String email,
                            String role) {
        super(oAuth2User.getAuthorities(), oAuth2User.getAttributes(), "id");
        this.userId = userId;
        this.email = email;
        this.role = role;
    }
}
