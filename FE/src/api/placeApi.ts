// ==========================================
// 장소 API 순수 호출 함수 (S14P21B205-151 패턴 예시)
// ==========================================
// 이 파일은 API 호출만 담당합니다.
// React Query와의 조합은 src/hooks/queries/place/에서 이루어집니다.

import { apiClient } from '@/api/axios';
import type { Place, ApiPaginationResponse, PlaceSearchRequest, PlaceSearchResponse } from '@/types/api';
import type { NearbyPlacesParams } from '@/types/map';

export const placeApi = {
/**
 * 주변 장소 목록 조회
 */
    getNearbyPlaces: async (params: NearbyPlacesParams): Promise<ApiPaginationResponse<Place>> => {
        const { data } = await apiClient.get<ApiPaginationResponse<Place>>('/api/places/nearby', {
            params,
        });
        return data;
    },

    /**
     * 장소 상세 정보 조회
     */
    getPlaceDetail: async (placeId: number): Promise<Place> => {
        const { data } = await apiClient.get<Place>(`/api/v1/places/${placeId}`);
        return data;
    },

    /**
     * 가게 검색
     * @param params - 검색 파라미터 (keyword, lat?, lng?, page, size)
     */
    searchPlaces: async (params: PlaceSearchRequest): Promise<PlaceSearchResponse> => {
        const queryParams = new URLSearchParams();
        
        // 필수 파라미터
        queryParams.append('keyword', params.keyword);
        queryParams.append('page', params.page.toString());
        queryParams.append('size', params.size.toString());
        
        // 선택 파라미터
        if (params.lat !== undefined) queryParams.append('lat', params.lat.toString());
        if (params.lng !== undefined) queryParams.append('lng', params.lng.toString());

        const { data } = await apiClient.get<PlaceSearchResponse>(
            `/api/v1/places/search?${queryParams.toString()}`
        );
        return data;
    },
};
