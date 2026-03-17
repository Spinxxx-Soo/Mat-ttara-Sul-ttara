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
  selectedPlaceId?: string | null;
  onMarkerClick?: (place: PlaceMarkerData, marker: NaverMarkerInstance) => void;
}

export const useMarkers = ({ mapInstance, places, selectedPlaceId, onMarkerClick }: UseMarkersProps) => {
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
      const position = new window.naver.maps.LatLng(place.position.lat, place.position.lng);
      const isSelected = place.id === selectedPlaceId;

      // TODO: 추후 커스텀 마커 이미지 적용 (195번 티켓 범주)
      // 현재는 선택 여부에 따라 기본 마커의 색상/크기를 다르게 보이는 용도로 zIndex만 조정
      const markerOptions: any = {
        position,
        map: mapInstance,
        zIndex: isSelected ? 100 : 1,
      };

      const marker = new window.naver.maps.Marker(markerOptions);

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
  }, [mapInstance, places, selectedPlaceId, onMarkerClick]);

  return { markers: markersRef.current };
};
