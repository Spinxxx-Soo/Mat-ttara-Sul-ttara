import { useEffect, useRef, useState } from 'react';
import { loadKakaoMapScript, isKakaoMapLoaded } from '@/lib/kakaoMap';
import { envConfig } from '@/config/env';
import type { Coordinates, MapViewport } from '@/types/map';
import type { KakaoMapInstance } from '@/types/kakao.d';

// ==========================================
// S14P21B205-188: 지도 SDK 로더 연동 훅 (Kakao Maps 버전)
// ==========================================

/**
 * @param defaultCenter 초기 지도 생성 시점에만 참조되는 중심 좌표입니다. 이후 Prop이 변경되어도 자동으로 지도가 이동하지 않습니다.
 * @param defaultZoom 초기 지도 생성 시점에만 참조되는 줌 레벨입니다.
 */
interface UseMapOptions {
  defaultCenter?: Coordinates;
  defaultZoom?: number;
}

interface UseMapReturn {
  mapRef: React.RefObject<HTMLDivElement>;
<<<<<<< HEAD
  mapInstance: React.MutableRefObject<NaverMapInstance | null>;
  mapReady: boolean;
=======
  mapInstance: React.MutableRefObject<KakaoMapInstance | null>;
>>>>>>> origin/develop
  viewport: MapViewport;
  sdkLoaded: boolean;
  sdkError: string | null;
  setCenter: (center: Coordinates) => void;
  setZoom: (zoom: number) => void;
}

export const useMap = (options: UseMapOptions = {}): UseMapReturn => {
  const {
    defaultCenter = { lat: 37.5665, lng: 126.978 }, // 서울 시청 (fallback)
    defaultZoom = 3, // Kakao Maps 줌 레벨은 숫자가 작을수록 확대, 3이 기본 적절값
  } = options;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<KakaoMapInstance | null>(null);

  const [sdkLoaded, setSdkLoaded] = useState<boolean>(isKakaoMapLoaded());
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewport, setViewport] = useState<MapViewport>({
    center: defaultCenter,
    zoom: defaultZoom,
  });

  // SDK 로드
  useEffect(() => {
    if (sdkLoaded) return;

    loadKakaoMapScript(envConfig.kakaoMapJsKey)
      .then(() => setSdkLoaded(true))
      .catch((err: Error) => setSdkError(err.message));
  }, [sdkLoaded]);

  // Kakao Maps SDK 로드 완료 후 지도 인스턴스 생성/해제 lifecycle 처리
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current || mapInstance.current) return;

<<<<<<< HEAD
    mapInstance.current = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: defaultZoom,
    });
    setMapReady(true);

    return () => {
      // 최초 생성한 지도 인스턴스를 해제해 내부 이벤트와 DOM 참조를 정리한다.
      setMapReady(false);
      try {
        mapInstance.current?.destroy();
      } catch {
        // 인증 실패 등으로 지도 내부가 깨진 상태에서 destroy 시 예외 무시
      }
      mapInstance.current = null;
=======
    const kakao = window.kakao;
    const options = {
      center: new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      level: defaultZoom,
    };

    const createdMap = new kakao.maps.Map(mapRef.current, options);
    mapInstance.current = createdMap;

    return () => {
      // Kakao Maps는 별도의 destroy 메서드 대신 DOM 초기화를 권장
      if (mapInstance.current === createdMap) {
        mapInstance.current = null;
      }

      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
>>>>>>> origin/develop
    };
  }, [sdkLoaded]);

  const setCenter = (center: Coordinates) => {
    setViewport((prev) => ({ ...prev, center }));
    if (mapInstance.current && sdkLoaded) {
      const kakao = window.kakao;
      mapInstance.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    }
  };

  const setZoom = (zoom: number) => {
    setViewport((prev) => ({ ...prev, zoom: zoom }));
    if (mapInstance.current && sdkLoaded) {
      mapInstance.current.setLevel(zoom);
    }
  };

  return {
    mapRef,
    mapInstance,
    mapReady,
    viewport,
    sdkLoaded,
    sdkError,
    setCenter,
    setZoom,
  };
};
