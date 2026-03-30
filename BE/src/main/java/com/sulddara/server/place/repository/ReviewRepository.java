package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.ReviewEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, Long> {
    @EntityGraph(attributePaths = {"user"})
    Page<ReviewEntity> findAllByPlaceIdOrderByCreatedAtDesc(Long placeId, Pageable pageable);
    
    @EntityGraph(attributePaths = {"user", "place"})
    @Query("SELECT r FROM ReviewEntity r WHERE r.id = :id")
    Optional<ReviewEntity> findByIdWithUser(@Param("id") Long id);
    
    boolean existsByPlaceIdAndUserId(Long placeId, Long userId);

    Optional<ReviewEntity> findByPlaceIdAndUserId(Long placeId, Long userId);

    @Query(value = "SELECT * FROM reviews WHERE place_id = :placeId AND user_id = :userId LIMIT 1", nativeQuery = true)
    Optional<ReviewEntity> findByPlaceIdAndUserIdIncludeDeleted(@Param("placeId") Long placeId, @Param("userId") Long userId);
}

