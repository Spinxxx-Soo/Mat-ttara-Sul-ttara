import { useEffect, useRef } from 'react';
import type { PlaceMarkerData } from '@/types/map';
import type { NaverMapInstance, NaverMarkerInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-194: 장소 마커 표시 및 관리 훅
// S14P21B205-195: 마커 데이터 타입(PlaceMarkerData)으로 변경
// S14P21B205-196: 마커 선택 상태 처리
// ==========================================

interface UseMarkersProps {
  mapInstance: NaverMapInstance | null;
  places: PlaceMarkerData[];
  selectedPlaceId?: number | null;
  onMarkerClick?: (place: PlaceMarkerData, marker: NaverMarkerInstance) => void;
}

export const useMarkers = ({ mapInstance, places, selectedPlaceId, onMarkerClick }: UseMarkersProps) => {
  // placeId -> marker 맵 참조
  const markersRef = useRef<Record<number, NaverMarkerInstance>>({});

  // 1. 마커 생성 및 제거 (mapInstance, places가 변경될 때만 실행)
  useEffect(() => {
    if (!mapInstance || !window.naver?.maps) return;

    // 기존 마커 전체 제거
    Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    markersRef.current = {};

    const newMarkersMap: Record<number, NaverMarkerInstance> = {};

    places.forEach((place) => {
      const position = new window.naver.maps.LatLng(place.position.lat, place.position.lng);
      
      const markerOptions: any = {
        position,
        map: mapInstance,
        zIndex: 1, // 초기값 설정, 선택 상태 변경 effect에서 관리
      };

      const marker = new window.naver.maps.Marker(markerOptions);

      if (onMarkerClick) {
        window.naver.maps.Event.addListener(marker, 'click', () => {
          onMarkerClick(place, marker);
        });
      }

      newMarkersMap[place.id] = marker;
    });

    markersRef.current = newMarkersMap;

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    };
  }, [mapInstance, places, onMarkerClick]);

  // 2. 선택 상태 표시 갱신 (selectedPlaceId가 변경될 때만 실행)
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([placeIdStr, marker]) => {
      const placeId = Number(placeIdStr);
      const isSelected = placeId === selectedPlaceId;
      // TODO: 추후 커스텀 이미지로 교체할 수 있는 영역
      marker.setZIndex(isSelected ? 100 : 1);
    });
  }, [selectedPlaceId, places]); 
  // places 의존성 추가: 새로운 places가 fetch되어 새로 마커가 그려진 직후에도 선택 상태를 반영하기 위함.

  // 컴포넌트 측에서 직접 제어할 수 있도록 맵 반환
  return { markers: markersRef.current };
};

