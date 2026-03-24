package com.sulddara.server.place.repository;

import com.sulddara.server.place.domain.ReviewEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, Long> {
    @EntityGraph(attributePaths = {"user"})
    List<ReviewEntity> findAllByPlaceIdOrderByCreatedAtDesc(Long placeId);
    
    boolean existsByPlaceIdAndUserId(Long placeId, Long userId);
}
