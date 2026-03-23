package com.sulddara.server.auth.oauth;

import com.sulddara.server.user.dto.UserAuthResultDto;
import com.sulddara.server.auth.jwt.GoogleUserInfo;
import com.sulddara.server.auth.jwt.NaverUserInfo;
import com.sulddara.server.auth.jwt.OAuth2UserInfo;
import com.sulddara.server.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserService userService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String provider = userRequest.getClientRegistration().getRegistrationId();

        OAuth2UserInfo userInfo = null;
        Map<String, Object> response;

        if (Objects.equals(provider, "naver")){
            userInfo = new NaverUserInfo(attributes);
            @SuppressWarnings("unchecked")
            Map<String, Object> naverResp = (Map<String, Object>) attributes.get("response");
            response = naverResp;
        } else if (Objects.equals(provider, "google")) {
            userInfo = new GoogleUserInfo(attributes);
            response = new HashMap<>(attributes);
            response.put("id", userInfo.getProviderId());
        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 공급자입니다.");
        }

        UserAuthResultDto user = userService.joinOrUpdate(userInfo);

        return new CustomOAuth2User(
                new DefaultOAuth2User(
                        Collections.singleton(new SimpleGrantedAuthority(user.role())),
                        response,
                        "id"
                ),
                user.userId(),
                user.email(),
                user.role()
        );
    }
}
