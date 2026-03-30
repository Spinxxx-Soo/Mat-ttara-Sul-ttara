import { apiClient } from '@/api/axios';
import type { 
  Plan, 
  PlanDetail, 
  ApiCursorPaginationResponse, 
  CreatePlanRequest, 
  UpdatePlanRequest 
} from '@/types/api';

/**
 * 플랜 관련 API (S14P21B205-213)
 */
export const planApi = {
  /**
   * 플랜 목록 조회 (S14P21B205-132: 커서 기반)
   */
  getPlans: async (cursor?: string | number, size = 10): Promise<ApiCursorPaginationResponse<Plan>> => {
    const { data } = await apiClient.get<ApiCursorPaginationResponse<Plan>>('/api/v1/plans', {
      params: { cursor, size },
    });
    return data;
  },

  /**
   * 플랜 상세 조회 (S14P21B205-213)
   */
  getPlanDetail: async (planId: string | number): Promise<PlanDetail> => {
    const { data } = await apiClient.get<PlanDetail>(`/api/v1/plans/${planId}`);
    return data;
  },

  /**
   * 공유 플랜 상세 조회 (S14P21B205-428)
   */
  getSharedPlanDetail: async (shareToken: string): Promise<PlanDetail> => {
    const { data } = await apiClient.get<PlanDetail>(`/api/v1/plans/share/${shareToken}`);
    return data;
  },

  /**
   * 플랜 생성
   */
  createPlan: async (planData: CreatePlanRequest): Promise<Plan> => {
    const { data } = await apiClient.post<Plan>('/api/v1/plans', planData);
    return data;
  },

  /**
   * 플랜 수정
   */
  updatePlan: async (planId: string | number, planData: UpdatePlanRequest): Promise<Plan> => {
    const { data } = await apiClient.patch<Plan>(`/api/v1/plans/${planId}`, planData);
    return data;
  },

  /**
   * 플랜 삭제
   */
  deletePlan: async (planId: string | number): Promise<void> => {
    await apiClient.delete(`/api/v1/plans/${planId}`);
  },
};
