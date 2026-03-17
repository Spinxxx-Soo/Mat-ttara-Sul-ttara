// ==========================================
// Query Key 팩토리 (S14P21B205-152 + 151 지원)
// ==========================================
// 모든 React Query의 queryKey는 이 파일에서 중앙 관리합니다.
// 도메인별로 구조화된 팩토리 함수를 사용하세요.

import type { NearbyPlacesParams } from '@/types/map';
import type { PlaceSearchRequest } from '@/types/api';

export const queryKeys = {
    // --- 장소 (Place) ---
    place: {
        all: ['place'] as const,
        nearby: (params: NearbyPlacesParams) =>
            [...queryKeys.place.all, 'nearby', params] as const,
        detail: (placeId: number) =>
            [...queryKeys.place.all, 'detail', placeId] as const,
        search: (params: PlaceSearchRequest) =>
            [...queryKeys.place.all, 'search', params] as const,
    },

    // --- 플랜 (Plan) ---
    plan: {
        all: ['plan'] as const,
        list: () => [...queryKeys.plan.all, 'list'] as const,
        detail: (planId: number) =>
            [...queryKeys.plan.all, 'detail', planId] as const,
    },

    // --- 사용자 (User) ---
    user: {
        all: ['user'] as const,
        me: () => [...queryKeys.user.all, 'me'] as const,
    },

    // --- 챗봇 (Chat) ---
    chat: {
        all: ['chat'] as const,
        sessions: () => [...queryKeys.chat.all, 'sessions'] as const,
        messages: (sessionId: string) =>
            [...queryKeys.chat.all, 'messages', sessionId] as const,
    },
} as const;
