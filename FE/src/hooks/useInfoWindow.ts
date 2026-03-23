import { useEffect, useRef } from 'react';
import type { KakaoMapInstance, KakaoMarkerInstance } from '@/types/kakao.d';

// ==========================================
// S14P21B205-19X: 마커 말풍선 팝업 관리 훅 (Kakao Maps 버전)
// ==========================================

interface UseInfoWindowReturn {
  openInfoWindow: (marker: KakaoMarkerInstance, contentHtml: string) => void;
  closeInfoWindow: () => void;
}

export const useInfoWindow = (mapInstance: KakaoMapInstance | null): UseInfoWindowReturn => {
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance || !window.kakao?.maps) return;

    const kakao = window.kakao;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new kakao.maps.InfoWindow({
        zIndex: 20,
        removable: false,
      });

      // 지도 빈 공간 클릭 시 InfoWindow 닫기
      kakao.maps.event.addListener(mapInstance, 'click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      });
    }

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [mapInstance]);

  const openInfoWindow = (marker: KakaoMarkerInstance, contentHtml: string) => {
    if (!infoWindowRef.current || !mapInstance) return;

    infoWindowRef.current.setContent(contentHtml);
    infoWindowRef.current.open(mapInstance, marker);
  };

  const closeInfoWindow = () => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  return { openInfoWindow, closeInfoWindow };
};
