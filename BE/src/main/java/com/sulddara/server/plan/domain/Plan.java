package com.sulddara.server.plan.domain;

import com.sulddara.server.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "plans", indexes = {
    @Index(name = "idx_plans_user_created", columnList = "user_id, created_at"),
    @Index(name = "idx_plans_deleted", columnList = "deleted_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Plan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private String title;

  private Long totalBudget;

  @Column(nullable = false)
  private Integer participantCount;

  @Column(nullable = false)
  private LocalDateTime meetingAt;

  @Column(length = 50)
  private String planType;

  @Column(columnDefinition = "TEXT")
  private String memo;

  @Column(nullable = false, unique = true)
  private String shareToken;

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;

  private LocalDateTime deletedAt;

  @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PlanDetail> details = new ArrayList<>();

  public Plan(User user, String title, Long totalBudget, Integer participantCount,
      LocalDateTime meetingAt, String planType, String memo, String shareToken) {
    this.user = user;
    this.title = title;
    this.totalBudget = totalBudget;
    this.participantCount = participantCount;
    this.meetingAt = meetingAt;
    this.planType = planType;
    this.memo = memo;
    this.shareToken = shareToken;
  }

  public void update(String title, LocalDateTime meetingAt, Integer participantCount,
      Long totalBudget, String planType, String memo) {
    this.title = title;
    this.meetingAt = meetingAt;
    this.participantCount = participantCount;
    this.totalBudget = totalBudget;
    this.planType = planType;
    this.memo = memo;
  }

  public void softDelete() {
    this.deletedAt = LocalDateTime.now();
  }

  public boolean isDeleted() {
    return this.deletedAt != null;
  }

  public void addDetail(PlanDetail detail) {
    this.details.add(detail);
    detail.setPlan(this);
  }
}
