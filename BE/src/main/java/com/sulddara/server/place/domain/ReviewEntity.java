package com.sulddara.server.place.domain;

import com.sulddara.server.global.error.exception.InvalidRequestException;
import com.sulddara.server.user.domain.UserEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "reviews")
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("deleted_at IS NULL")
@SQLDelete(sql = "UPDATE reviews SET deleted_at = NOW() WHERE review_id = ?")
public class ReviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private PlaceEntity place;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String content;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public ReviewEntity(PlaceEntity place, UserEntity user, Integer rating, String content) {
        validatePlace(place);
        validateUser(user);
        validateRating(rating);

        this.place = place;
        this.user = user;
        this.rating = rating;
        this.content = content;

        place.addReview(this);
    }

    public void update(Integer rating, String content) {
        validateRating(rating);
        this.rating = rating;
        this.content = content;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    private void validatePlace(PlaceEntity place) {
        if (place == null) {
            throw new InvalidRequestException("place must not be null");
        }
    }

    private void validateUser(UserEntity user) {
        if (user == null) {
            throw new InvalidRequestException("user must not be null");
        }
    }

    private void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new InvalidRequestException("rating must be between 1 and 5");
        }
    }
}
