import { useEffect, useRef, useState } from 'react';
import type { PlaceMarkerData } from '@/types/map';
import type { KakaoMapInstance, KakaoMarkerInstance } from '@/types/kakao.d';

// ==========================================
// S14P21B205-194: 장소 마커 표시 및 관리 훅 (Kakao Maps 버전)
// ==========================================

interface UseMarkersProps {
  mapInstance: KakaoMapInstance | null;
  places: PlaceMarkerData[];
  selectedPlaceId?: number | null;
  onMarkerClick?: (place: PlaceMarkerData, marker: KakaoMarkerInstance) => void;
}

export const useMarkers = ({ mapInstance, places, selectedPlaceId, onMarkerClick }: UseMarkersProps) => {
  // placeId -> marker 맵 참조 (성능 및 클린업용)
  const markersRef = useRef<Record<number, KakaoMarkerInstance>>({});
  // 리액티브하게 반환하기 위한 상태
  const [markers, setMarkers] = useState<Record<number, KakaoMarkerInstance>>({});

  // 1. 마커 생성 및 제거 (mapInstance, places가 변경될 때만 실행)
  useEffect(() => {
    if (!mapInstance || !window.kakao?.maps) return;

    const kakao = window.kakao;

    // 기존 마커 전체 제거
    Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    markersRef.current = {};

    const newMarkersMap: Record<number, KakaoMarkerInstance> = {};

    places.forEach((place) => {
      const position = new kakao.maps.LatLng(place.position.lat, place.position.lng);
      
      const marker = new kakao.maps.Marker({
        position,
        map: mapInstance,
        zIndex: 1,
      });

      if (onMarkerClick) {
        kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(place, marker);
        });
      }

      newMarkersMap[place.id] = marker;
    });

    markersRef.current = newMarkersMap;
    setMarkers(newMarkersMap);

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    };
  }, [mapInstance, places, onMarkerClick]);

  // 2. 선택 상태 표시 갱신 (selectedPlaceId가 변경될 때만 실행)
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([placeIdStr, marker]) => {
      const placeId = Number(placeIdStr);
      const isSelected = placeId === selectedPlaceId;
      // Z-Index로 선택 상태 강조
      marker.setZIndex(isSelected ? 10 : 1);
      
      // TODO: 선택 시 마커 이미지를 변경하고 싶다면 marker.setImage() 사용 가능
    });
  }, [selectedPlaceId, places]); 

  return { markers };
};
