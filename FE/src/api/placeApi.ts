// ==========================================
// 장소 API 순수 호출 함수 (S14P21B205-151 패턴 예시)
// ==========================================
// 이 파일은 API 호출만 담당합니다.
// React Query와의 조합은 src/hooks/queries/place/에서 이루어집니다.

import { apiClient } from '@/api/axios';
import type { Place, ApiPaginationResponse } from '@/types/api';
import type { NearbyPlacesParams } from '@/types/map';

/**
 * 주변 장소 목록 조회
 */
export const placeApi = {
    getNearbyPlaces: async (params: NearbyPlacesParams): Promise<ApiPaginationResponse<Place>> => {
        const { data } = await apiClient.get<ApiPaginationResponse<Place>>('/api/places/nearby', {
            params,
        });
        return data;
    },

    getPlaceDetail: async (placeId: number): Promise<Place> => {
        const { data } = await apiClient.get<Place>(`/api/places/${placeId}`);
        return data;
    },
};
