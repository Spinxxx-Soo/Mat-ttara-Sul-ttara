package com.sulddara.server.plan.repository;

import com.sulddara.server.plan.domain.PlanDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlanDetailRepository extends JpaRepository<PlanDetailEntity, Long> {

  List<PlanDetailEntity> findByPlanIdAndDeletedAtIsNullOrderBySeqNoAsc(Long planId);
}
