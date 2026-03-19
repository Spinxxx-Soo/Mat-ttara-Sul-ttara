package com.sulddara.server.plan.domain;

import com.sulddara.server.global.error.exception.InvalidRequestException;
import com.sulddara.server.place.domain.Place;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@SQLRestriction("deleted_at IS NULL")
@Table(name = "plan_details", indexes = {
    @Index(name = "idx_plan_details_plan_seq", columnList = "plan_id, seq_no")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PlanDetailEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private PlanEntity plan;

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

    public PlanDetailEntity(Place place, Integer seqNo, String recommendReason) {
        validatePlace(place);
        validateSeqNo(seqNo);
        
        this.place = place;
        this.seqNo = seqNo;
        this.recommendReason = recommendReason;
    }

    void setPlan(PlanEntity plan) {
        this.plan = plan;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    private void validatePlace(Place place) {
        if (place == null) {
            throw new InvalidRequestException("place must not be null");
        }
    }

    private void validateSeqNo(Integer seqNo) {
        if (seqNo == null || seqNo < 1) {
            throw new InvalidRequestException("seqNo must be greater than 0");
        }
    }
}
