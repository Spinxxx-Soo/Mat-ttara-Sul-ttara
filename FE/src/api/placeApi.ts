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

export const placeApi = {
/**
 * 주변 장소 목록 조회
 */
    getNearbyPlaces: async (params: NearbyPlacesParams): Promise<ApiPaginationResponse<Place>> => {
        const { data } = await apiClient.get<ApiPaginationResponse<Place>>('/api/places/nearby', {
            params,
            meta: { dedupe: 'replace-prev' },
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
            `/api/v1/places/search?${queryParams.toString()}`,
            { meta: { dedupe: 'replace-prev' } }
        );
        return data;
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
