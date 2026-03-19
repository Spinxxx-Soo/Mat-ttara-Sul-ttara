import { useQuery } from '@tanstack/react-query';
import { planApi } from '@/api/planApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { mapPlanToUI, mapPlanListToUI } from '@/utils/mappers/planMapper';

/**
 * 플랜 목록 조회 쿼리 - UI 모델로 변환 (S14P21B205-214)
 */
export const usePlansQuery = (page = 0, size = 10) => {
  return useQuery({
    queryKey: [...queryKeys.plan.list(), page, size],
    queryFn: () => planApi.getPlans(page, size),
    select: mapPlanListToUI,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 플랜 상세 조회 쿼리 - UI 모델로 변환 (S14P21B205-214)
 */
export const usePlanDetailQuery = (planId: string) => {
  return useQuery({
    queryKey: queryKeys.plan.detail(planId),
    queryFn: () => planApi.getPlanDetail(planId),
    enabled: !!planId,
    select: mapPlanToUI,
  });
};
