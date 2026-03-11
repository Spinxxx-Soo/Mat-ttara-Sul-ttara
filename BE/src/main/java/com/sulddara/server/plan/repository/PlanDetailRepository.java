package com.sulddara.server.plan.repository;

import com.sulddara.server.plan.domain.PlanDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlanDetailRepository extends JpaRepository<PlanDetail, Long> {

  List<PlanDetail> findByPlanIdAndDeletedAtIsNullOrderBySeqNoAsc(Long planId);
}
