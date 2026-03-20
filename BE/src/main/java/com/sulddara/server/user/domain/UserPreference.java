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
@Table(name = "user_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserPreference {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false)
  private String usageType; // 사적 or 공적

  @Column(nullable = false)
  private String ageGroup; // 약속 참여 나잇대

  @Column(nullable = false)
  private String gender; // 성별 분위기

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;

  public UserPreference(String usageType, String ageGroup, String gender) {
    this.usageType = usageType;
    this.ageGroup = ageGroup;
    this.gender = gender;
  }

  void setUser(UserEntity user) {
    this.user = user;
  }

  public void updatePreferences(String usageType, String ageGroup, String gender) {
    this.usageType = usageType;
    this.ageGroup = ageGroup;
    this.gender = gender;
  }
}
