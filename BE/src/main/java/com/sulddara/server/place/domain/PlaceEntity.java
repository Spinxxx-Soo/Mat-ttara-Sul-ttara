package com.sulddara.server.place.domain;

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
@Table(name = "places", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"provider", "external_place_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PlaceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String provider;

    @Column(name = "external_place_id", nullable = false)
    private String externalPlaceId;

    @Column(nullable = false)
    private String name;

    private String address;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 500)
    private String originImgUrl;

    @Column(length = 100)
    private String category;

    @Column(nullable = false)
    private Boolean isOpen = true;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    private String url;

    @Column(length = 20)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String openingHours;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime lastStatusCheckedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime lastUpdatedAt;

    public PlaceEntity(String provider, String externalPlaceId, String name,
                       String address, Double lat, Double lng) {
        this.provider = provider;
        this.externalPlaceId = externalPlaceId;
        this.name = name;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
    }

    public void updateImageUrl(String imageUrl) {
        if (imageUrl != null) {
            this.imageUrl = imageUrl;
        }
    }

    public void updateDetails(String imageUrl, String description, String openingHours, String phone, String url) {
        if (imageUrl != null) this.imageUrl = imageUrl;
        if (description != null) this.description = description;
        if (openingHours != null) this.openingHours = openingHours;
        if (phone != null) this.phone = phone;
        if (url != null) this.url = url;
        this.lastUpdatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "place")
    private List<ReviewEntity> reviews = new ArrayList<>();

    public void addReview(ReviewEntity review) {
        this.reviews.add(review);
    }
}
