import { apiClient } from '@/api/axios';
import type { Plan, ApiPaginationResponse } from '@/types/api';

/**
 * 플랜 관련 API (S14P21B205-213)
 */
export const planApi = {
  /**
   * 플랜 목록 조회
   */
  getPlans: async (page = 0, size = 10): Promise<ApiPaginationResponse<Plan>> => {
    const { data } = await apiClient.get<ApiPaginationResponse<Plan>>('/api/v1/plans', {
      params: { page, size },
    });
    return data;
  },

  /**
   * 플랜 상세 조회 (S14P21B205-213)
   */
  getPlanDetail: async (planId: string): Promise<Plan> => {
    const { data } = await apiClient.get<Plan>(`/api/v1/plans/${planId}`);
    return data;
  },

  /**
   * 플랜 생성
   */
  createPlan: async (planData: Partial<Plan>): Promise<Plan> => {
    const { data } = await apiClient.post<Plan>('/api/v1/plans', planData);
    return data;
  },

  /**
   * 플랜 수정
   */
  updatePlan: async (planId: string, planData: Partial<Plan>): Promise<Plan> => {
    const { data } = await apiClient.patch<Plan>(`/api/v1/plans/${planId}`, planData);
    return data;
  },

  /**
   * 플랜 삭제
   */
  deletePlan: async (planId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/plans/${planId}`);
  },
};
