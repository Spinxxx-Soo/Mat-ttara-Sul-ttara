package com.sulddara.server.user.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@Builder
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String providerId;

    @Column(nullable = false)
    private String provider; // e.g., KAKAO, GOOGLE

    @Column(nullable = false)
    private String name;

    private String email;

    private String bio;

    @Column(nullable = false)
    private String role; // e.g., ROLE_USER

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime lastLoginAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private UserPreference preference;

    public void updateProfile(String name, String bio) {
        this.name = name;
        this.bio = bio;
    }

    public void updateLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public void setPreference(UserPreference preference) {
        this.preference = preference;
        preference.setUser(this);
    }

    public void changeName(String name) {
        this.name = name;
    }
}
