package com.sulddara.server.plan.repository;

import com.sulddara.server.plan.domain.Plan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

  Page<Plan> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);

  java.util.List<Plan> findByUserIdAndDeletedAtIsNullOrderByIdDesc(Long userId, Pageable pageable);

  java.util.List<Plan> findByUserIdAndIdLessThanAndDeletedAtIsNullOrderByIdDesc(Long userId, Long id, Pageable pageable);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"details", "details.place"})
  Optional<Plan> findWithDetailsByIdAndDeletedAtIsNull(Long planId);

  Optional<Plan> findByIdAndDeletedAtIsNull(Long planId);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"details", "details.place"})
  Optional<Plan> findWithDetailsByShareTokenAndDeletedAtIsNull(String shareToken);
}
