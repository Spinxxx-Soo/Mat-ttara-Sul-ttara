import { useEffect, useRef, useState } from 'react';
import { loadNaverMapScript, isNaverMapLoaded } from '@/lib/naverMap';
import type { Coordinates, MapViewport } from '@/types/map';

// ==========================================
// S14P21B205-188: 지도 SDK 로더 연동 훅
// ==========================================

interface UseMapOptions {
  defaultCenter?: Coordinates;
  defaultZoom?: number;
}

interface UseMapReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  mapInstance: React.MutableRefObject<any | null>;
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
  const mapInstance = useRef<any | null>(null);

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

  const setCenter = (center: Coordinates) => {
    setViewport((prev) => ({ ...prev, center }));
    if (mapInstance.current && sdkLoaded) {
      // @ts-expect-error: naver types will be added in 189
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
