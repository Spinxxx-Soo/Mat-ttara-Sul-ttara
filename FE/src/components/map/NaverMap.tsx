import { useEffect, useRef } from 'react';
import { useMap } from '@/hooks/useMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Coordinates } from '@/types/map';
import type { NaverMapInstance, NaverMarkerInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-189: 지도 인스턴스 lifecycle 처리
// S14P21B205-192: 현재 위치 마커 및 초기 중심 좌표 반영
// ==========================================

interface NaverMapProps {
  lat?: number;
  lng?: number;
  onMapReady?: (mapInstance: NaverMapInstance) => void;
  onIdle?: (center: Coordinates, zoom: number) => void;
  onClick?: (coord: Coordinates) => void;
}

export default function NaverMap({
  lat = 37.3595704,
  lng = 127.105399,
  onMapReady,
  onIdle,
  onClick,
}: NaverMapProps) {
  const defaultCenter: Coordinates = { lat, lng };

  const { mapRef, mapInstance, sdkLoaded, sdkError, setCenter } = useMap({ defaultCenter });
  const { coordinates, errorType } = useGeolocation(false);
  const locationMarkerRef = useRef<NaverMarkerInstance | null>(null);

  // 지도 인스턴스가 준비되면 외부로 전달 및 이벤트 등록
  useEffect(() => {
    if (sdkLoaded && mapInstance.current) {
      if (onMapReady) {
        onMapReady(mapInstance.current);
      }

      const listeners: any[] = [];

      if (onIdle) {
        const listener = window.naver.maps.Event.addListener(mapInstance.current, 'idle', () => {
          const center = mapInstance.current.getCenter();
          const zoom = mapInstance.current.getZoom();
          onIdle({ lat: center.lat(), lng: center.lng() }, zoom);
        });
        listeners.push(listener);
      }

      if (onClick) {
        const listener = window.naver.maps.Event.addListener(mapInstance.current, 'click', (e: any) => {
          onClick({ lat: e.coord.lat(), lng: e.coord.lng() });
        });
        listeners.push(listener);
      }

      return () => {
        listeners.forEach(window.naver.maps.Event.removeListener);
      };
    }
  }, [sdkLoaded, mapInstance, onMapReady, onIdle, onClick]);

  // 현재 위치 좌표가 나오면 지도를 중심동하고 마커를 표시
  useEffect(() => {
    if (coordinates && sdkLoaded && mapInstance.current) {
      setCenter(coordinates);

      if (!locationMarkerRef.current) {
        locationMarkerRef.current = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(coordinates.lat, coordinates.lng),
          map: mapInstance.current,
        });
      } else {
        locationMarkerRef.current.setPosition(
          new window.naver.maps.LatLng(coordinates.lat, coordinates.lng)
        );
      }
    }
    
    return () => {
      // 컴포넌트 언마운트 시 마커 정리
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
      }
    };
  }, [coordinates, sdkLoaded, mapInstance, setCenter]);

  if (sdkError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">
        지도를 불러올 수 없습니다: {sdkError}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px]">
      {!sdkLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
          <span className="text-gray-500 text-sm">지도 로딩 중...</span>
        </div>
      )}
      {/* 권한 거부 등 에러 상황 표시 (선택사항) */}
      {errorType === 'denied' && (
        <div className="absolute top-4 left-4 right-4 p-2 bg-yellow-100 text-yellow-800 text-sm rounded shadow z-10 opacity-90">
          위치 권한이 거부되어 기본 위치를 표시합니다.
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full rounded-md shadow-inner" />
    </div>
  );
}
