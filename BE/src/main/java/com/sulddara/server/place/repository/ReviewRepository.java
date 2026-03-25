package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.ReviewEntity;
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
    List<ReviewEntity> findAllByPlaceIdOrderByCreatedAtDesc(Long placeId);
    
    @EntityGraph(attributePaths = {"user", "place"})
    @Query("SELECT r FROM ReviewEntity r WHERE r.id = :id")
    Optional<ReviewEntity> findByIdWithUser(@Param("id") Long id);
    
    boolean existsByPlaceIdAndUserId(Long placeId, Long userId);
}
