import { useQuery } from '@tanstack/react-query';
import { planApi } from '@/api/planApi';
import { queryKeys } from '@/hooks/queries/queryKeys';

/**
 * 플랜 목록 조회 쿼리
 */
export const usePlansQuery = (page = 0, size = 10) => {
  return useQuery({
    queryKey: [...queryKeys.plan.list(), page, size],
    queryFn: () => planApi.getPlans(page, size),
  });
};

/**
 * 플랜 상세 조회 쿼리 (S14P21B205-213)
 */
export const usePlanDetailQuery = (planId: string) => {
  return useQuery({
    queryKey: queryKeys.plan.detail(planId),
    queryFn: () => planApi.getPlanDetail(planId),
    enabled: !!planId,
  });
};
