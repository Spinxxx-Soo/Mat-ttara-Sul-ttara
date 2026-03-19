package com.sulddara.server.user.domain;

import com.sulddara.server.global.error.exception.InvalidRequestException;
import com.sulddara.server.user.domain.enums.SocialType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    private String bio;

    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SocialType socialType;

    @Column(nullable = false)
    private String socialId;

    @Column(nullable = false)
    private String role;

    private LocalDateTime lastLoginAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserPreference preference;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public UserEntity(
            String email,
            String name,
            String bio,
            String profileImageUrl,
            SocialType socialType,
            String socialId,
            String role
    ) {
        validateEmail(email);
        validateName(name);
        validateSocialType(socialType);
        validateSocialId(socialId);
        validateRole(role);

        this.email = email;
        this.name = name;
        this.bio = bio;
        this.profileImageUrl = profileImageUrl;
        this.socialType = socialType;
        this.socialId = socialId;
        this.role = role;
    }

    public void updateName(String name) {
        validateName(name);
        this.name = name;
    }

    public void updateBio(String bio) {
        this.bio = bio;
    }

    public void updateProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public void updateLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public void updatePreference(UserPreference preference) {
        this.preference = preference;
        if (preference != null) {
            preference.setUser(this);
        }
    }

    private void validateRole(String role) {
        if (role == null || role.isBlank()) {
            throw new InvalidRequestException("role must not be blank");
        }
    }

    private void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidRequestException("email must not be blank");
        }
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidRequestException("name must not be blank");
        }
    }

    private void validateSocialType(SocialType socialType) {
        if (socialType == null) {
            throw new InvalidRequestException("socialType must not be null");
        }
    }

    private void validateSocialId(String socialId) {
        if (socialId == null || socialId.isBlank()) {
            throw new InvalidRequestException("socialId must not be blank");
        }
    }
}
