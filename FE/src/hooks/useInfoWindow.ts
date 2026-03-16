import { useEffect, useRef } from 'react';
import type { NaverMapInstance, NaverMarkerInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-19X: 마커 말풍선 팝업 관리 훅
// ==========================================

interface UseInfoWindowReturn {
  openInfoWindow: (marker: NaverMarkerInstance, contentHtml: string) => void;
  closeInfoWindow: () => void;
}

export const useInfoWindow = (mapInstance: NaverMapInstance | null): UseInfoWindowReturn => {
  // naver.maps.InfoWindow 인스턴스를 하나만 생성해 두고 재사용합니다.
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance || !window.naver?.maps) return;

    // 초기 1회 생성 (스타일 및 껍데기 설정)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.naver.maps.InfoWindow({
        content: '',
        backgroundColor: 'white',
        borderColor: '#e5e7eb', // tailwind gray-200
        borderWidth: 1,
        anchorSize: new window.naver.maps.Size(10, 10),
        anchorSkew: true,
        anchorColor: 'white',
        pixelOffset: new window.naver.maps.Point(0, -10),
        disableAnchor: false,
      });

      // 지도 빈 공간 클릭 시 열려있는 InfoWindow 닫기
      window.naver.maps.Event.addListener(mapInstance, 'click', () => {
        if (infoWindowRef.current?.getMap()) {
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

  const openInfoWindow = (marker: NaverMarkerInstance, contentHtml: string) => {
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
