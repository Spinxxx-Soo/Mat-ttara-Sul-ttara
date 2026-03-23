import { useEffect, useRef } from 'react';
import { useMap } from '@/hooks/useMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Coordinates } from '@/types/map';
import type { Place } from '@/types/api';
import type { KakaoMapInstance } from '@/types/kakao.d';

// ==========================================
// S14P21B205-189: 지도 인스턴스 lifecycle 처리 (Kakao Maps 버전)
// S14P21B205-192: 현재 위치 마커 및 초기 중심 좌표 반영
// S14P21B205-196: 마커 클릭 시 선택 상태 관리 구현
// S14P21B205-198, 199: 지도 이동 시 재조회 여부 및 최적화
// ==========================================

interface KakaoMapProps {
  className?: string;
  lat?: number;
  lng?: number;
  places?: Place[];
  selectedPlaceId?: string | number | null;
  onMapReady?: (mapInstance: KakaoMapInstance) => void;
  onIdle?: (center: Coordinates, zoom: number) => void;
  onPlaceClick?: (place: Place) => void;
  onClick?: (coord: Coordinates) => void;
}

export default function KakaoMap({
  className = 'w-full h-[400px]',
  lat = 37.3595704,
  lng = 127.105399,
  places = [],
  selectedPlaceId,
  onMapReady,
  onIdle,
  onPlaceClick,
  onClick,
}: KakaoMapProps) {
  const defaultCenter: Coordinates = { lat, lng };

  const { mapRef, mapInstance, sdkLoaded, sdkError, setCenter } = useMap({ defaultCenter });
  const { coordinates, errorType } = useGeolocation(false);
  
  const locationMarkerRef = useRef<any>(null);
  const placesMarkersRef = useRef<Map<number, any>>(new Map());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 지도 인스턴스가 준비되면 외부로 전달 및 이벤트 등록
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;

    const currentMap = mapInstance.current;
    const kakao = window.kakao;

    if (onMapReady) {
      onMapReady(currentMap);
    }

    // idle 이벤트 디바운스 처리
    const idleListener = kakao.maps.event.addListener(currentMap, 'idle', () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      idleTimerRef.current = setTimeout(() => {
        const center = currentMap.getCenter();
        const level = currentMap.getLevel();
        onIdle?.({ lat: center.getLat(), lng: center.getLng() }, level);
      }, 500);
    });

    // 클릭 이벤트
    const clickListener = kakao.maps.event.addListener(currentMap, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      onClick?.({ lat: latlng.getLat(), lng: latlng.getLng() });
    });

    return () => {
      kakao.maps.event.removeListener(currentMap, 'idle', idleListener);
      kakao.maps.event.removeListener(currentMap, 'click', clickListener);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [sdkLoaded, mapInstance, onMapReady, onIdle, onClick]);

  // 현재 위치 좌표가 나오면 지도를 중심동하고 마커를 표시
  useEffect(() => {
    if (coordinates && sdkLoaded && mapInstance.current) {
      setCenter(coordinates);
      const kakao = window.kakao;

      if (!locationMarkerRef.current) {
        const content = `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"></div>
            <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
          </div>
        `;

        locationMarkerRef.current = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(coordinates.lat, coordinates.lng),
          content: content,
          map: mapInstance.current,
        });
      } else {
        locationMarkerRef.current.setPosition(
          new kakao.maps.LatLng(coordinates.lat, coordinates.lng)
        );
      }
    }
  }, [coordinates, sdkLoaded, mapInstance, setCenter]);

  // 외부에서 lat/lng(검색 결과 중심 등)를 바꿔줄 때 지도를 함께 recenter
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;
    setCenter({ lat, lng });
  }, [lat, lng, sdkLoaded, mapInstance, setCenter]);

  // 마커 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
        locationMarkerRef.current = null;
      }
    };
  }, []);

  // 장소 마커 표시 및 업데이트
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;

    const currentMap = mapInstance.current;
    const kakao = window.kakao;
    
    // 이전 마커들 중 현재 리스트에 없는 것 삭제
    const currentPlaceIds = new Set(places.map(p => p.placeId));
    placesMarkersRef.current.forEach((markerObj, id) => {
      if (!currentPlaceIds.has(id)) {
        markerObj.overlay.setMap(null);
        placesMarkersRef.current.delete(id);
      }
    });

    // 새 마커 추가 또는 업데이트
    places.forEach((place) => {
      const isSelected = selectedPlaceId?.toString() === place.placeId.toString();
      const existing = placesMarkersRef.current.get(place.placeId);
      
      const content = `
        <div class="relative flex flex-col items-center group cursor-pointer" id="marker-${place.placeId}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
            isSelected ? 'bg-primary scale-110 z-20 shadow-xl border-primary' : 'bg-slate-500 hover:bg-primary z-10'
          }">
            <span class="material-symbols-outlined text-sm text-white">restaurant</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r-2 border-b-2 border-white ${
            isSelected ? 'bg-primary border-primary' : 'bg-slate-500'
          }"></div>
        </div>
      `;

      if (!existing) {
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(place.lat, place.lng),
          content: content,
          map: currentMap,
          yAnchor: 1,
        });

        // CustomOverlay는 이벤트를 직접 지원하지 않으므로 DOM 이벤트를 활용하거나 
        // 투명한 마커를 겹쳐서 사용해야 합니다. 여기서는 마커 기능을 위해 빈 마커를 추가로 생성합니다.
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(place.lat, place.lng),
          map: currentMap,
          opacity: 0, // 보이지 않게 처리
        });

        kakao.maps.event.addListener(marker, 'click', () => {
          onPlaceClick?.(place);
        });

        placesMarkersRef.current.set(place.placeId, { overlay, marker });
      } else {
        // 이미 있는 경우 스타일 업데이트 (content 교체)
        existing.overlay.setContent(content);
        existing.overlay.setZIndex(isSelected ? 100 : 10);
      }
    });
  }, [places, selectedPlaceId, sdkLoaded, mapInstance, onPlaceClick]);

  if (sdkError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">
        지도를 불러올 수 없습니다: {sdkError}
      </div>
    );
  }

  return (
    <div className={className + " relative"}>
      {!sdkLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 rounded-md z-10 backdrop-blur-sm">
          <span className="text-gray-500 text-sm">지도 로딩 중...</span>
        </div>
      )}
      
      {errorType && (
        <div className="absolute top-4 left-4 right-4 p-2 bg-yellow-100/90 text-yellow-800 text-sm rounded shadow z-10">
          {errorType === 'denied'
            ? '위치 권한이 거부되어 기본 위치(SSAFY 대전)를 표시합니다.'
            : '위치 정보를 가져올 수 없어 기본 위치(SSAFY 대전)를 표시합니다.'}
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
