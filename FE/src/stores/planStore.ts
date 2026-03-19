import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanUIModel } from '@/types/plan';

interface PlanState {
  selectedPlan: PlanUIModel | null;
  setSelectedPlan: (plan: PlanUIModel | null) => void;
  clearSelectedPlan: () => void;
}

/**
 * 선택된 플랜(Selected Plan) 상태를 관리하는 스토어
 * - 사용자가 현재 작업 중인 플랜을 전역적으로 추적합니다.
 * - persist 미네웨어를 사용하여 페이지 새로고침 시에도 선택 상태를 유지합니다.
 */
export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      selectedPlan: null,
      setSelectedPlan: (plan) => set({ selectedPlan: plan }),
      clearSelectedPlan: () => set({ selectedPlan: null }),
    }),
    {
      name: 'plan-storage', // 로컬 스토리지 키 이름
    }
  )
);
