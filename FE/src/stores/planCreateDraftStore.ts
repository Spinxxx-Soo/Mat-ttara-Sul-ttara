import { create } from 'zustand'
import type { Place } from '@/types/api'

/**
 * 메인(AI 추천) → 플랜 생성 화면으로 선택 장소를 넘길 때 사용.
 * MyPlanCreate에서 `getState().draftPlace`로 읽고, 반영 후 `setDraftPlace(null)`로 비운다.
 */
type PlanCreateDraftState = {
  draftPlace: Place | null
  setDraftPlace: (place: Place | null) => void
}

export const usePlanCreateDraftStore = create<PlanCreateDraftState>((set) => ({
  draftPlace: null,
  setDraftPlace: (place) => set({ draftPlace: place }),
}))
