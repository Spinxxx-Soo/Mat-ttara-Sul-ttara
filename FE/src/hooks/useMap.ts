import { useEffect, useRef, useState } from 'react';
import { loadNaverMapScript, isNaverMapLoaded } from '@/lib/naverMap';
import type { Coordinates, MapViewport } from '@/types/map';
import type { NaverMapInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-188: 지도 SDK 로더 연동 훅
// ==========================================

interface UseMapOptions {
  defaultCenter?: Coordinates;
  defaultZoom?: number;
}

interface UseMapReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  mapInstance: React.MutableRefObject<NaverMapInstance | null>;
  viewport: MapViewport;
  sdkLoaded: boolean;
  sdkError: string | null;
  setCenter: (center: Coordinates) => void;
  setZoom: (zoom: number) => void;
}

export const useMap = (options: UseMapOptions = {}): UseMapReturn => {
  const {
    defaultCenter = { lat: 37.5665, lng: 126.978 }, // 서울 시청 (fallback)
    defaultZoom = 15,
  } = options;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMapInstance | null>(null);

  const [sdkLoaded, setSdkLoaded] = useState<boolean>(isNaverMapLoaded());
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({
    center: defaultCenter,
    zoom: defaultZoom,
  });

  // SDK 로드
  useEffect(() => {
    if (sdkLoaded) return;

    loadNaverMapScript()
      .then(() => setSdkLoaded(true))
      .catch((err: Error) => setSdkError(err.message));
  }, [sdkLoaded]);

  // S14P21B205-189: SDK 로드 완료 후 지도 인스턴스 생성/해제 lifecycle 처리
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current || mapInstance.current) return;

    mapInstance.current = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: defaultZoom,
    });

    return () => {
      // 최초 생성한 지도 인스턴스를 해제해 내부 이벤트와 DOM 참조를 정리한다.
      mapInstance.current?.destroy();
      mapInstance.current = null;
    };
    // defaultCenter/defaultZoom은 지도 최초 생성 시점의 초기값으로만 사용한다.
  }, [sdkLoaded]);

  const setCenter = (center: Coordinates) => {
    setViewport((prev) => ({ ...prev, center }));
    if (mapInstance.current && sdkLoaded) {
      mapInstance.current.setCenter(new window.naver.maps.LatLng(center.lat, center.lng));
    }
  };

  const setZoom = (zoom: number) => {
    setViewport((prev) => ({ ...prev, zoom }));
    if (mapInstance.current && sdkLoaded) {
      mapInstance.current.setZoom(zoom);
    }
  };

  return {
    mapRef,
    mapInstance,
    viewport,
    sdkLoaded,
    sdkError,
    setCenter,
    setZoom,
  };
};
