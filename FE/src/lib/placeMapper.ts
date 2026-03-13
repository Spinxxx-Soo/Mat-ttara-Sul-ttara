import type { Place } from '@/types/api';
import type { PlaceMarkerData } from '@/types/map';

// ==========================================
// S14P21B205-195: 장소 목록 DTO -> 마커 UI 모델 변환기
// ==========================================

export const mapPlaceToMarkerData = (place: Place): PlaceMarkerData => {
  return {
    id: place.placeId.toString(),
    position: {
      lat: place.lat,
      lng: place.lng,
    },
    // Place 속성들
    name: place.name,
    address: place.address,
    phone: place.phone,
    rating: place.rating,
    
    // 추가적인 마커 시각 디자인을 위한 필드 매핑이 필요하면 여기에 추가
    // (예: 카테고리에 따른 아이콘 속성 반환 등)
  };
};

export const mapPlacesToMarkerDataList = (places: Place[]): PlaceMarkerData[] => {
  return places.map(mapPlaceToMarkerData);
};
