// ==========================================
// 가게 리뷰 React Query (S14P21B205-50~55)
// ==========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeApi } from '@/api/placeApi';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { extractApiErrorMessage } from '@/lib/apiUtils';
import type { CreateReviewRequest, UpdateReviewRequest } from '@/types/api';

const DEFAULT_PAGE_SIZE = 10;

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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
    },
    meta: { errorMessage: extractApiErrorMessage },
  });
}

export function useDeletePlaceReview(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) =>
      placeApi.deletePlaceReview(placeId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.place.all, 'reviews', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.place.detail(placeId),
      });
    },
    meta: { errorMessage: extractApiErrorMessage },
  });
}
