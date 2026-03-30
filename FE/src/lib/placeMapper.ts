import type { Place } from '@/types/api';
import type { PlaceMarkerData } from '@/types/map';
import { getPlaceKey } from '@/lib/placeIdentity';

// ==========================================
// S14P21B205-195: 장소 목록 DTO -> 마커 UI 모델 변환기
// ==========================================

function hashPlaceKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const mapPlaceToMarkerData = (place: Place): PlaceMarkerData => {
  return {
    id: place.placeId ?? hashPlaceKey(getPlaceKey(place)),
    position: {
      lat: place.lat,
      lng: place.lng,
    },
    // Place 속성들
    name: place.name,
    address: place.address,
    phone: place.phone,
    rating: place.rating,
    isEnriched: place.isEnriched,
  };
};

export const mapPlacesToMarkerDataList = (places: Place[]): PlaceMarkerData[] => {
  return places.map(mapPlaceToMarkerData);
};
