package com.sulddara.server.common.fixture;

import com.sulddara.server.user.domain.UserEntity;
import com.sulddara.server.user.domain.enums.SocialType;
import org.springframework.test.util.ReflectionTestUtils;

public class UserEntityFixture {

    public static UserEntity createDefaultUser() {
        return new UserEntity(
                "tester@example.com",
                "테스터",
                "테스트 소개",
                "http://example.com/profile.jpg",
                SocialType.GOOGLE,
                "google_123456",
                "ROLE_USER"
        );
    }

    public static UserEntity createUserWithId(Long id) {
        UserEntity user = createDefaultUser();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
