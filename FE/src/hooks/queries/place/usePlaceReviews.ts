// ==========================================
// 가게 리뷰 React Query (S14P21B205-50~55)
// ==========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeApi } from '@/api/placeApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type { CreateReviewRequest, UpdateReviewRequest } from '@/types/api';

const DEFAULT_PAGE_SIZE = 10;

const patchPlacesRatingInLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  placeDetail: {
    externalPlaceId?: string | null;
    rating?: number | null;
    reviewScore?: number | null;
    placeId: number | null;
  }
) => {
  const externalPlaceId = placeDetail.externalPlaceId ?? null;
  if (!externalPlaceId || placeDetail.placeId == null) return;

  // 1) 주변 맛집(nearby): select로 Place[]만 캐시에 들어있음
  queryClient.setQueriesData(
    { queryKey: [...queryKeys.place.all, 'nearby'] },
    (oldData: unknown) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map((p: any) => {
        if (!p || p.externalPlaceId !== externalPlaceId) return p;
        return {
          ...p,
          internalPlaceId: placeDetail.placeId,
          rating: placeDetail.rating ?? p.rating,
          reviewScore: placeDetail.reviewScore ?? p.reviewScore,
        };
      });
    }
  );

  // 2) 검색(search): PlaceSearchResponse 형태로 캐시에 들어있음
  queryClient.setQueriesData(
    { queryKey: [...queryKeys.place.all, 'search'] },
    (oldData: any) => {
      if (!oldData || !Array.isArray(oldData.content)) return oldData;
      return {
        ...oldData,
        content: oldData.content.map((p: any) => {
          if (!p || p.externalPlaceId !== externalPlaceId) return p;
          return {
            ...p,
            internalPlaceId: placeDetail.placeId,
            rating: placeDetail.rating ?? p.rating,
            reviewScore: placeDetail.reviewScore ?? p.reviewScore,
          };
        }),
      };
    }
  );
};

export function usePlaceReviewsList(
  placeId: number | null,
  page: number,
  size: number = DEFAULT_PAGE_SIZE
) {
  return useQuery({
    queryKey:
      placeId != null
        ? queryKeys.place.reviews(placeId, page, size)
        : ['place', 'reviews', 'disabled'],
    queryFn: () => placeApi.getPlaceReviews(placeId!, page, size),
    enabled: placeId != null && placeId > 0,
    meta: { errorMessage: extractApiErrorMessage },
  });
}

export function useCreatePlaceReview(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateReviewRequest) =>
      placeApi.createPlaceReview(placeId, body),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.all,
      });

      // 리스트(검색/주변맛집)에는 카카오 원본 데이터가 캐시되어 별점이 즉시 반영되지 않을 수 있어,
      // 최신 place detail을 가져와 동일 externalPlaceId 항목의 rating을 패치한다.
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.place.detail(placeId),
          queryFn: () => placeApi.getPlaceDetail(placeId),
        });
        patchPlacesRatingInLists(queryClient, detail);
      } catch {
        // detail fetch 실패 시에는 invalidate로만 갱신(백그라운드 재시도)한다.
      }
    },
    meta: { errorMessage: extractApiErrorMessage },
  });
}

export function useUpdatePlaceReview(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: number;
      body: UpdateReviewRequest;
    }) => placeApi.updatePlaceReview(placeId, reviewId, body),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.all,
      });

      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.place.detail(placeId),
          queryFn: () => placeApi.getPlaceDetail(placeId),
        });
        patchPlacesRatingInLists(queryClient, detail);
      } catch {
        // ignore
      }
    },
    meta: { errorMessage: extractApiErrorMessage },
  });
}

export function useDeletePlaceReview(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) =>
      placeApi.deletePlaceReview(placeId, reviewId),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.all,
      });

      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.place.detail(placeId),
          queryFn: () => placeApi.getPlaceDetail(placeId),
        });
        patchPlacesRatingInLists(queryClient, detail);
      } catch {
        // ignore
      }
    },
    meta: { errorMessage: extractApiErrorMessage },
  });
}
