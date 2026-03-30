// ==========================================
// 장소 React Query 훅 (S14P21B205-151)
// ==========================================
// 순수 API 함수(placeApi)를 React Query로 래핑합니다.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeApi } from '@/api/placeApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type { NearbyPlacesParams } from '@/types/map';
import type {
    PlaceSearchRequest,
    ApiPaginationResponse,
    Place,
    PlaceSyncRequest,
} from '@/types/api';

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
        select: (data: ApiPaginationResponse<Place>) => data.content, // 페이지네이션 래퍼 벗기고 배열만 반환
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

/**
 * 가게 검색 훅
 * @param params - 검색 파라미터 (keyword, lat?, lng?, page, size)
 * @param enabled - false이면 자동 조회를 비활성화
 */
export const useSearchPlaces = (
    params: PlaceSearchRequest,
    enabled = true,
) => {
    return useQuery({
        queryKey: queryKeys.place.search(params),
        queryFn: () => placeApi.searchPlaces(params),
        enabled: enabled && !!params.keyword, // keyword가 있을 때만 조회
        staleTime: 1000 * 60, // 1분간 fresh 상태 유지
        meta: {
            errorMessage: extractApiErrorMessage,
        },
    });
};

// 모듈 레벨에서 현재 동기화 중인 외부 장소 ID 관리 (클라이언트 사이드 중복 요청 방지)
const syncingExternalIds = new Set<string>();

/**
 * 카카오 외부 장소를 백엔드 내부 placeId로 동기화하는 뮤테이션 훅
 */
export const useSyncPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (body: PlaceSyncRequest) => {
            if (syncingExternalIds.has(body.externalPlaceId)) {
                return null;
            }

            syncingExternalIds.add(body.externalPlaceId);
            try {
                return await placeApi.syncPlace(body);
            } finally {
                syncingExternalIds.delete(body.externalPlaceId);
            }
        },
        onSuccess: (data) => {
            if (!data) return;

            // 동기화 후 상세 조회가 가능해지므로 장소 관련 캐시를 비워 최신 상태를 보장
            queryClient.invalidateQueries({ queryKey: queryKeys.place.all });
        },
        meta: {
            errorMessage: extractApiErrorMessage,
        },
    });
};

/**
 * 내부 placeId 기반 장소 AI 보강 훅
 * POST /api/v1/places/{placeId}/enrich
 */
export const useEnrichPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (placeId: number) => {
            return await placeApi.enrichPlace(placeId);
        },
        onSuccess: () => {
            // 보강 후 상세 캐시를 비워 최신 place detail을 보장
            queryClient.invalidateQueries({ queryKey: queryKeys.place.all });
        },
        meta: {
            errorMessage: extractApiErrorMessage,
        },
    });
};
