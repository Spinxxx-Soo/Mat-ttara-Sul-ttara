package com.sulddara.server.plan.repository;

import com.sulddara.server.plan.domain.Plan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

  Page<Plan> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

  java.util.List<Plan> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

  java.util.List<Plan> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long id, Pageable pageable);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"details", "details.place"})
  Optional<Plan> findWithDetailsById(Long planId);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"details", "details.place"})
  Optional<Plan> findWithDetailsByShareToken(String shareToken);

  Optional<Plan> findByShareToken(String shareToken);
}
