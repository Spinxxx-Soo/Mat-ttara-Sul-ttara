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

  Optional<Plan> findByIdAndDeletedAtIsNull(Long planId);

  Optional<Plan> findByShareTokenAndDeletedAtIsNull(String shareToken);
}
