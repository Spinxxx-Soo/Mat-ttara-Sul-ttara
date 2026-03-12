// ==========================================
// 장소 React Query 훅 (S14P21B205-151)
// ==========================================
// 순수 API 함수(placeApi)를 React Query로 래핑합니다.

import { useQuery } from '@tanstack/react-query';
import { placeApi } from '@/api/placeApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type { NearbyPlacesParams } from '@/types/map';

/**
 * 주변 장소 목록을 조회하는 훅
 * @param params 위/경도, 반경 등 조회 조건
 * @param enabled false이면 자동 조회를 비활성화 (지도 이동 전 등)
 */
export const useNearbyPlaces = (
    params: NearbyPlacesParams,
    enabled = true,
) => {
    return useQuery({
        queryKey: queryKeys.place.nearby(params),
        queryFn: () => placeApi.getNearbyPlaces(params),
        enabled,
        staleTime: 1000 * 60, // 1분간 fresh 상태 유지 (중복 요청 방지)
        select: (data) => data.content, // 페이지네이션 래퍼 벗기고 배열만 반환
        meta: {
            errorMessage: extractApiErrorMessage,
        },
    });
};

/**
 * 장소 상세 정보를 조회하는 훅
 */
export const usePlaceDetail = (placeId: number, enabled = true) => {
    return useQuery({
        queryKey: queryKeys.place.detail(placeId),
        queryFn: () => placeApi.getPlaceDetail(placeId),
        enabled: enabled && !!placeId,
        staleTime: 1000 * 60 * 5, // 5분
    });
};
