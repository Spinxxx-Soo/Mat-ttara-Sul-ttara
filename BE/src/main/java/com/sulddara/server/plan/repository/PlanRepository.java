package com.sulddara.server.plan.repository;

import com.sulddara.server.plan.domain.PlanEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<PlanEntity, Long> {

    Page<PlanEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<PlanEntity> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    List<PlanEntity> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long id, Pageable pageable);

    @EntityGraph(attributePaths = {"details", "details.place"})
    Optional<PlanEntity> findWithDetailsById(Long planId);

    @EntityGraph(attributePaths = {"details", "details.place"})
    Optional<PlanEntity> findWithDetailsByShareToken(String shareToken);

    Optional<PlanEntity> findByShareToken(String shareToken);
}
