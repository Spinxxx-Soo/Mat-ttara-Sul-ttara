import type { Place, PlaceSyncRequest } from '@/types/api';

const COORD_PRECISION = 6;

const roundCoord = (value: number) => Number(value.toFixed(COORD_PRECISION));

export const getPlaceKey = (place: Place): string => {
  if (place.externalPlaceId) {
    return `external:${place.externalPlaceId}`;
  }

  if (place.internalPlaceId != null) {
    return `internal:${place.internalPlaceId}`;
  }

  return `fallback:${place.name}:${roundCoord(place.lat)}:${roundCoord(place.lng)}`;
};

export const getInternalPlaceId = (place: Place): number | null => {
  if (place.internalPlaceId != null) {
    return place.internalPlaceId;
  }

  if (!place.externalPlaceId) {
    return place.placeId;
  }

  return null;
};

/** 지도·채팅 카드 선택에 쓰는 단일 숫자 id (placeId 우선, 없으면 internalPlaceId) */
export const resolveNumericPlaceId = (place: Place): number | null => {
  if (place.placeId != null) return place.placeId;
  if (place.internalPlaceId != null) return place.internalPlaceId;
  return null;
};

export const isSamePlace = (left: Place, right: Place): boolean => {
  if (left.externalPlaceId && right.externalPlaceId) {
    return left.externalPlaceId === right.externalPlaceId;
  }

  const leftInternalId = getInternalPlaceId(left);
  const rightInternalId = getInternalPlaceId(right);

  if (leftInternalId != null && rightInternalId != null) {
    return leftInternalId === rightInternalId;
  }

  return (
    left.name === right.name
    && roundCoord(left.lat) === roundCoord(right.lat)
    && roundCoord(left.lng) === roundCoord(right.lng)
  );
};

export const buildPlaceSyncRequest = (place: Place): PlaceSyncRequest => ({
  externalPlaceId: place.externalPlaceId ?? String(place.placeId),
  name: place.name,
  address: place.address,
  category: place.category,
  lat: place.lat,
  lng: place.lng,
  phone: place.phone,
  url: place.url,
});

export const withInternalPlaceId = (place: Place, placeId: number): Place => ({
  ...place,
  internalPlaceId: placeId,
});
