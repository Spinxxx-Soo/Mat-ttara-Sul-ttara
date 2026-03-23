// ==========================================
// 장소 React Query 훅 (S14P21B205-151)
// ==========================================
// 순수 API 함수(placeApi)를 React Query로 래핑합니다.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// 모듈 레벨에서 현재 보강 중인 장소 ID 관리 (클라이언트 사이드 중복 요청 방지)
const enrichingIds = new Set<number>();

/**
 * 부족한 장소 정보를 크롤링으로 보강 요청하는 뮤테이션 훅
 * S14P21B205-LazyLoading 전략 반영: 동일 장소 중복 호출 방지 로직 추가
 */
export const useEnrichPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (placeId: number) => {
            // 이미 보강 작업이 진행 중인 ID라면 중복 요청 방지를 위해 중단
            if (enrichingIds.has(placeId)) {
                return null;
            }

            enrichingIds.add(placeId);
            try {
                return await placeApi.enrichPlaceData(placeId);
            } finally {
                // 작업 완료 후(성공/실패 무관) 관리 큐에서 제거
                enrichingIds.delete(placeId);
            }
        },
        onSuccess: (data, placeId) => {
            // 중복 요청 등으로 인해 API 호출이 스킵된 경우(null 반환) 무시
            if (!data) return;

            // 상세 정보 쿼리 캐시 갱신
            queryClient.invalidateQueries({ queryKey: queryKeys.place.detail(placeId) });
            // 검색 결과나 주변 장소 목록에도 영향이 있을 수 있으므로 관련 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: queryKeys.place.all });
        },
    });
};
