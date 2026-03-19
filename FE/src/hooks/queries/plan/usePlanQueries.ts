import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { planApi } from '@/api/planApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { mapPlanToUI, mapPlanListToUI } from '@/utils/mappers/planMapper';
import { CreatePlanRequest } from '@/types/api';

/**
 * 플랜 목록 조회 쿼리 - UI 모델로 변환 (S14P21B205-132: 커서 기반)
 */
export const usePlansQuery = (cursor?: string | number, size = 10) => {
  return useQuery({
    queryKey: [...queryKeys.plan.list(), cursor, size],
    queryFn: () => planApi.getPlans(cursor, size),
    select: mapPlanListToUI,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 플랜 상세 조회 쿼리 - UI 모델로 변환 (S14P21B205-132)
 */
export const usePlanDetailQuery = (planId: string) => {
  return useQuery({
    queryKey: queryKeys.plan.detail(planId),
    queryFn: () => planApi.getPlanDetail(planId),
    enabled: !!planId,
    select: mapPlanToUI,
  });
};

/**
 * 플랜 생성 Mutation (S14P21B205-132)
 */
export const useCreatePlanMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreatePlanRequest) => planApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.list() });
      navigate('/my-plan');
    },
  });
};

/**
 * 플랜 삭제 Mutation (S14P21B205-132)
 */
export const useDeletePlanMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (planId: string | number) => planApi.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.list() });
      navigate('/my-plan');
    },
  });
};
