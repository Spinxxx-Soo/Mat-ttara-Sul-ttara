// ==========================================
// 장소 React Query 훅 (S14P21B205-151)
// ==========================================
// 순수 API 함수(placeApi)를 React Query로 래핑합니다.

import { useQuery } from '@tanstack/react-query';
import { placeApi } from '@/api/placeApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type { NearbyPlacesParams } from '@/types/map';
import type { PlaceSearchRequest, ApiPaginationResponse, Place } from '@/types/api';

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

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * 부족한 장소 정보를 크롤링으로 보강 요청하는 뮤테이션 훅
 * S14P21B205-LazyLoading 전략 반영
 */
export const useEnrichPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (placeId: number) => placeApi.enrichPlaceData(placeId),
        onSuccess: (_, placeId) => {
            // 상세 정보 쿼리 캐시 갱신
            queryClient.invalidateQueries({ queryKey: queryKeys.place.detail(placeId) });
            // 검색 결과나 주변 장소 목록에도 영향이 있을 수 있으므로 관련 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: queryKeys.place.all });
        },
    });
};
