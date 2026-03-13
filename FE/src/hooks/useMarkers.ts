import { useEffect, useRef } from 'react';
import type { Place } from '@/types/api';
import type { NaverMapInstance, NaverMarkerInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-194: 장소 마커 표시 및 관리 훅
// ==========================================

interface UseMarkersProps {
  mapInstance: NaverMapInstance | null;
  places: Place[];
  onMarkerClick?: (place: Place, marker: NaverMarkerInstance) => void;
}

export const useMarkers = ({ mapInstance, places, onMarkerClick }: UseMarkersProps) => {
  // 생성된 마커 인스턴스들을 보관
  const markersRef = useRef<NaverMarkerInstance[]>([]);

  useEffect(() => {
    // 지도 인스턴스가 없거나 window.naver가 아직 로드되지 않은 경우 무시
    if (!mapInstance || !window.naver?.maps) return;

    // 1. 기존 마커들 삭제 (초기화)
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 2. 새로운 장소 배열로 마커 생성
    const newMarkers = places.map((place) => {
      const position = new window.naver.maps.LatLng(place.lat, place.lng);
      
      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstance,
        // TODO: 마커 아이콘 커스텀 (카테고리별 분기)
        // icon: { ... }
      });

      // 마커 클릭 이벤트 등록
      if (onMarkerClick) {
        window.naver.maps.Event.addListener(marker, 'click', () => {
          onMarkerClick(place, marker);
        });
      }

      return marker;
    });

    markersRef.current = newMarkers;

    // cleanup: 언마운트 시 모든 마커 지도에서 제거
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [mapInstance, places, onMarkerClick]);

  return { markers: markersRef.current };
};
