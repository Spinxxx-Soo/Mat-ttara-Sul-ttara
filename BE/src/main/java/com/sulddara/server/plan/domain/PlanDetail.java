package com.sulddara.server.plan.domain;

import com.sulddara.server.place.domain.Place;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

import org.hibernate.annotations.SQLRestriction;

@Entity
@SQLRestriction("deleted_at IS NULL")
@Table(name = "plan_details", indexes = {
    @Index(name = "idx_plan_details_plan_seq", columnList = "plan_id, seq_no")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PlanDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plan_id", nullable = false)
  private Plan plan;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "place_id", nullable = false)
  private Place place;

  @Column(name = "seq_no", nullable = false)
  private Integer seqNo;

  @Column(columnDefinition = "TEXT")
  private String recommendReason;

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;

  private LocalDateTime deletedAt;

  public PlanDetail(Place place, Integer seqNo, String recommendReason) {
    this.place = place;
    this.seqNo = seqNo;
    this.recommendReason = recommendReason;
  }

  void setPlan(Plan plan) {
    this.plan = plan;
  }

  public void softDelete() {
    this.deletedAt = LocalDateTime.now();
  }
}
