import type { Place, RecommendedPlace } from '@/types/api';

export function recommendedPlaceToPlace(r: RecommendedPlace): Place {
  return {
    placeId: r.placeId,
    internalPlaceId: r.placeId,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    recommendReason: r.recommendReason ?? undefined,
    tags: r.tags ?? undefined,
  };
}
