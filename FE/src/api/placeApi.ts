// ==========================================
// 장소 API 순수 호출 함수 (S14P21B205-151 패턴 예시)
// ==========================================
// 이 파일은 API 호출만 담당합니다.
// React Query와의 조합은 src/hooks/queries/place/에서 이루어집니다.

import { apiClient } from '@/api/axios';
import type {
  Place,
  ApiPaginationResponse,
  PlaceSearchRequest,
  PlaceSearchResponse,
  PlaceReviewsResponse,
  RecommendedPlace,
  CreateReviewRequest,
  UpdateReviewRequest,
  Review,
} from '@/types/api';
import type { NearbyPlacesParams } from '@/types/map';

/** 카카오 Places.keywordSearch / Local API: 페이지당 최대 15 (초과 시 400) */
const KAKAO_KEYWORD_SEARCH_MAX_SIZE = 15;

function clampKakaoKeywordPageSize(size?: number): number {
  const n = size ?? 10;
  return Math.min(KAKAO_KEYWORD_SEARCH_MAX_SIZE, Math.max(1, n));
}

export const placeApi = {
/**
 * 주변 장소 목록 조회
 */
    getNearbyPlaces: async (params: NearbyPlacesParams): Promise<ApiPaginationResponse<Place>> => {
        return new Promise((resolve, reject) => {
            const { kakao } = window as any;
            if (!kakao || !kakao.maps || !kakao.maps.services) {
                return reject(new Error('카카오맵 SDK가 로드되지 않았습니다.'));
            }

            const ps = new kakao.maps.services.Places();
            const searchKeyword = params.category && params.category !== '전체' ? params.category : '맛집';
            
            const options: any = {
                location: new kakao.maps.LatLng(params.lat, params.lng),
                radius: params.radius || 1000,
                size: clampKakaoKeywordPageSize(params.size ?? 15),
                page: params.page || 1,
                sort: kakao.maps.services.SortBy.DISTANCE,
            };

            ps.keywordSearch(searchKeyword, (data: any[], status: any, pagination: any) => {
                if (status === kakao.maps.services.Status.OK) {
                    const content: Place[] = data.map(item => ({
                        placeId: Number(item.id),
                        name: item.place_name,
                        address: item.road_address_name || item.address_name,
                        phone: item.phone,
                        lat: Number(item.y),
                        lng: Number(item.x),
                        category: item.category_name.split(' > ').pop() || null,
                        rating: 0, // 카카오 SDK 기본 검색에선 평점 미제공
                        imageUrl: null,
                        isOpen: true
                    }));

                    resolve({
                        content,
                        pageInfo: {
                            page: pagination.current,
                            size: options.size,
                            totalElements: pagination.totalCount,
                            totalPages: pagination.last,
                            hasNext: pagination.hasNext
                        }
                    });
                } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                    resolve({
                        content: [],
                        pageInfo: { page: 1, size: 15, totalElements: 0, totalPages: 0, hasNext: false }
                    });
                } else {
                    reject(new Error('장소 검색 중 오류가 발생했습니다.'));
                }
            }, options);
        });
    },

    /**
     * 장소 상세 정보 조회
     */
    getPlaceDetail: async (placeId: number): Promise<Place> => {
        // 상세 정보 조회를 위한 카카오 로직 (선택사항, 일단 기존 유지)
        const { data } = await apiClient.get<Place>(`/api/v1/places/${placeId}`);
        return data;
    },

    /**
     * 가게 검색
     * @param params - 검색 파라미터 (keyword, lat?, lng?, page, size)
     */
    searchPlaces: async (params: PlaceSearchRequest): Promise<PlaceSearchResponse> => {
        return new Promise((resolve, reject) => {
            const { kakao } = window as any;
            if (!kakao || !kakao.maps || !kakao.maps.services) {
                return reject(new Error('카카오맵 SDK가 로드되지 않았습니다.'));
            }

            const ps = new kakao.maps.services.Places();
            const options: any = {
                size: clampKakaoKeywordPageSize(params.size),
                page: params.page || 1,
            };

            if (params.lat && params.lng) {
                options.location = new kakao.maps.LatLng(params.lat, params.lng);
                options.radius = 2000;
                options.sort = kakao.maps.services.SortBy.DISTANCE;
            }

            ps.keywordSearch(params.keyword, (data: any[], status: any, pagination: any) => {
                if (status === kakao.maps.services.Status.OK) {
                    const content: Place[] = data.map(item => ({
                        placeId: Number(item.id),
                        name: item.place_name,
                        address: item.road_address_name || item.address_name,
                        phone: item.phone,
                        lat: Number(item.y),
                        lng: Number(item.x),
                        category: item.category_name.split(' > ').pop() || null,
                        rating: 0,
                        isOpen: true
                    }));

                    resolve({
                        content,
                        pageInfo: {
                            page: pagination.current,
                            size: options.size,
                            totalElements: pagination.totalCount,
                            totalPages: pagination.last,
                            hasNext: pagination.hasNext
                        }
                    });
                } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                    resolve({
                        content: [],
                        pageInfo: { page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false }
                    });
                } else {
                    reject(new Error('검색 중 오류가 발생했습니다.'));
                }
            }, options);
        });
    },

  /**
   * 채팅 세션 기준 AI 추천 장소 목록 (SSE 수신 후 갱신용)
   * GET /api/v1/places/recommend?sessionId=
   */
  getRecommendedPlaces: async (
    sessionId: string | number,
  ): Promise<RecommendedPlace[]> => {
    const { data } = await apiClient.get<RecommendedPlace[] | { content: RecommendedPlace[] }>(
      '/api/v1/places/recommend',
      {
        params: { sessionId: String(sessionId) },
      },
    );

    if (Array.isArray(data)) return data;
    return data.content ?? [];
  },

  /**
   * 부족한 장소 정보를 크롤링으로 보강 요청
   */
  enrichPlaceData: async (placeId: number): Promise<Place> => {
    const { data } = await apiClient.post<Place>(`/api/v1/places/${placeId}/enrich`);
    return data;
  },

  /**
   * 가게별 리뷰 목록 조회
   * GET /api/v1/places/{placeId}/reviews?page=&size=
   */
  getPlaceReviews: async (
    placeId: number,
    page: number,
    size: number
  ): Promise<PlaceReviewsResponse> => {
    const { data } = await apiClient.get<PlaceReviewsResponse>(
      `/api/v1/places/${placeId}/reviews`,
      {
        params: { page, size },
      }
    );
    return data;
  },

  /**
   * 리뷰 등록
   * POST /api/v1/places/{placeId}/reviews
   */
  createPlaceReview: async (
    placeId: number,
    body: CreateReviewRequest
  ): Promise<Review> => {
    const { data } = await apiClient.post<Review>(
      `/api/v1/places/${placeId}/reviews`,
      body
    );
    return data;
  },

  /**
   * 리뷰 수정
   * PATCH /api/v1/places/{placeId}/reviews/{reviewId}
   */
  updatePlaceReview: async (
    placeId: number,
    reviewId: number,
    body: UpdateReviewRequest
  ): Promise<Review> => {
    const { data } = await apiClient.patch<Review>(
      `/api/v1/places/${placeId}/reviews/${reviewId}`,
      body
    );
    return data;
  },

  /**
   * 리뷰 삭제
   * DELETE /api/v1/places/{placeId}/reviews/{reviewId}
   */
  deletePlaceReview: async (placeId: number, reviewId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/places/${placeId}/reviews/${reviewId}`);
  },
};
