import { create } from 'zustand';
import type { Place } from '@/types/api';

/**
 * 메인(챗봇) 화면: AI가 추천한 장소를 지도에 표시하기 위한 상태
 * - ChatWidget에서 메시지/응답 기반으로 갱신
 * - Main에서 주변 맛집 목록과 병합해 KakaoMap에 전달
 */
type SetPlaces = (places: Place[] | ((prev: Place[]) => Place[])) => void;

interface ChatMapState {
  aiRecommendedPlaces: Place[];
  setAiRecommendedPlaces: SetPlaces;
  mergeAiRecommendedPlaces: (places: Place[]) => void;
  clearAiRecommendedPlaces: () => void;
}

/** 동일 placeId는 incoming이 기존 필드를 덮어씀 */
export function mergeByPlaceId(existing: Place[], incoming: Place[]): Place[] {
  const m = new Map<number, Place>();
  existing.forEach((p) => m.set(p.placeId, p));
  incoming.forEach((p) => {
    const prev = m.get(p.placeId);
    m.set(p.placeId, prev ? { ...prev, ...p } : p);
  });
  return Array.from(m.values());
}

export const useChatMapStore = create<ChatMapState>((set, get) => ({
  aiRecommendedPlaces: [],
  setAiRecommendedPlaces: (places) =>
    set((s) => ({
      aiRecommendedPlaces:
        typeof places === 'function' ? places(s.aiRecommendedPlaces) : places,
    })),
  mergeAiRecommendedPlaces: (incoming) => {
    if (!incoming.length) return;
    set({
      aiRecommendedPlaces: mergeByPlaceId(get().aiRecommendedPlaces, incoming),
    });
  },
  clearAiRecommendedPlaces: () => set({ aiRecommendedPlaces: [] }),
}));
