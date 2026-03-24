import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { planApi } from '@/api/planApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { mapPlanToUI, mapPlanListToUI } from '@/utils/mappers/planMapper';
import { CreatePlanRequest, UpdatePlanRequest, Plan } from '@/types/api';

const STALE_TIME = 60 * 1000; // 1분

/**
 * 플랜 목록 조회 쿼리 - UI 모델로 변환 (S14P21B205-132: 커서 기반)
 */
export const usePlansQuery = (cursor?: string | number, size = 10) => {
  return useQuery({
    queryKey: [...queryKeys.plan.list(), cursor, size],
    queryFn: () => planApi.getPlans(cursor, size),
    select: mapPlanListToUI,
    placeholderData: (previousData) => previousData,
    staleTime: STALE_TIME,
  });
};

/**
 * 플랜 목록 무한 스크롤 쿼리 (S14P21B205-212 피드백 반영: P1 리스트 누적 처리)
 */
export const useInfinitePlansQuery = (size = 10) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.plan.list(), 'infinite', size],
    queryFn: ({ pageParam }) => planApi.getPlans(pageParam as string | number | undefined, size),
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
    select: (data) => ({
      pages: data.pages.map(mapPlanListToUI),
      pageParams: data.pageParams,
    }),
    staleTime: STALE_TIME,
  });
};

/**
 * 플랜 상세 조회 쿼리 - UI 모델로 변환 (S14P21B205-132)
 */
export const usePlanDetailQuery = (planId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.plan.detail(planId),
    queryFn: () => planApi.getPlanDetail(planId),
    enabled: !!planId,
    select: mapPlanToUI,
    staleTime: STALE_TIME,
    placeholderData: () => {
      // 무한 스크롤 캐시에서 가장 최근 데이터 탐색 (size = 10 기준)
      const infiniteData = queryClient.getQueryData<{
        pages: { content: Plan[] }[];
      }>([...queryKeys.plan.list(), 'infinite', 10]);

      if (infiniteData?.pages) {
        for (const page of infiniteData.pages) {
          const plan = page.content?.find((p) => p.planId.toString() === planId);
          if (plan) {
            // 상세 API 데이터와 부분적으로 맞출 수 있는 속성을 반환
            return {
              ...plan,
              // places 등은 상세 API 호출 완료 후 덮어써짐
            } as any;
          }
        }
      }
      return undefined;
    },
  });
};

/**
 * 플랜 생성 Mutation (S14P21B205-132)
 */
export const useCreatePlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanRequest) => planApi.createPlan(data),
    onSuccess: () => {
      // 목록 캐시 무효화 (S14P21B205-259)
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.list() });
    },
  });
};

/**
 * 플랜 수정 Mutation (S14P21B205-133, 264)
 */
export const useUpdatePlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string | number; data: UpdatePlanRequest }) => 
      planApi.updatePlan(planId, data),
    onSuccess: (_, variables) => {
      // 목록 및 특정 상세 캐시 무효화 (S14P21B205-259)
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.detail(variables.planId.toString()) });
    },
  });
};

/**
 * 플랜 삭제 Mutation (S14P21B205-132)
 */
export const useDeletePlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string | number) => planApi.deletePlan(planId),
    onSuccess: (_, planId) => {
      // 목록 캐시 무효화 및 삭제된 상세 캐시 제거
      queryClient.invalidateQueries({ queryKey: queryKeys.plan.list() });
      queryClient.removeQueries({ queryKey: queryKeys.plan.detail(planId.toString()) });
    },
  });
};
