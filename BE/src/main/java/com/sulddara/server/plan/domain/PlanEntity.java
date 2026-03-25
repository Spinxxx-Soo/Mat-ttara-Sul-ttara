package com.sulddara.server.plan.domain;

import com.sulddara.server.global.error.exception.InvalidRequestException;
import com.sulddara.server.user.domain.UserEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.SQLDelete;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@SQLRestriction("deleted_at IS NULL")
@SQLDelete(sql = "UPDATE plans SET deleted_at = NOW() WHERE id = ?")
@Table(name = "plans")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDateTime meetingAt;

    private Integer participantCount;

    private Long totalBudget;

    private String planType;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(nullable = false, unique = true)
    private String shareToken;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seqNo ASC")
    private List<PlanDetailEntity> details = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public PlanEntity(
            UserEntity user,
            String title,
            LocalDateTime meetingAt,
            Integer participantCount,
            Long totalBudget,
            String planType,
            String memo,
            String shareToken
    ) {
        validateUser(user);
        validateTitle(title);
        validateMeetingAt(meetingAt);
        validateParticipantCount(participantCount);
        validateShareToken(shareToken);

        this.user = user;
        this.title = title;
        this.meetingAt = meetingAt;
        this.participantCount = participantCount;
        this.totalBudget = totalBudget;
        this.planType = planType;
        this.memo = memo;
        this.shareToken = shareToken;
    }

    public void addDetail(PlanDetailEntity detail) {
        this.details.add(detail);
        detail.assignPlan(this);
    }

    public void removeDetail(PlanDetailEntity detail) {
        this.details.remove(detail);
        detail.assignPlan(null);
    }

    public void update(
            String title,
            LocalDateTime meetingAt,
            Integer participantCount,
            Long totalBudget,
            String planType,
            String memo
    ) {
        validateTitle(title);
        validateMeetingAt(meetingAt);
        validateParticipantCount(participantCount);

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

    private void validateUser(UserEntity user) {
        if (user == null) {
            throw new InvalidRequestException("user must not be null");
        }
    }

    private void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidRequestException("title must not be blank");
        }
    }

    private void validateMeetingAt(LocalDateTime meetingAt) {
        if (meetingAt == null) {
            throw new InvalidRequestException("meetingAt must not be null");
        }
    }

    private void validateParticipantCount(Integer participantCount) {
        if (participantCount == null || participantCount < 1) {
            throw new InvalidRequestException("participantCount must be greater than 0");
        }
    }

    private void validateShareToken(String shareToken) {
        if (shareToken == null || shareToken.isBlank()) {
            throw new InvalidRequestException("shareToken must not be blank");
        }
    }
}
