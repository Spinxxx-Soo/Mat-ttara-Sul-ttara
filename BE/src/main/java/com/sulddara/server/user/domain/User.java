package com.sulddara.server.user.domain;

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
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String oAuthId;

  @Column(nullable = false)
  private String provider; // e.g., KAKAO, GOOGLE

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String role; // e.g., ROLE_USER

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;

  @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  private UserPreference preference;

  public User(String oAuthId, String provider, String name, String role) {
    this.oAuthId = oAuthId;
    this.provider = provider;
    this.name = name;
    this.role = role;
  }

  public void updateName(String name) {
    this.name = name;
  }

  public void setPreference(UserPreference preference) {
    this.preference = preference;
    preference.setUser(this);
  }
}
