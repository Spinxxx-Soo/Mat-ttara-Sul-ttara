import { useMap } from '@/hooks/useMap';
import type { Coordinates } from '@/types/map';
import type { NaverMapInstance } from '@/types/naver.d';

// ==========================================
// S14P21B205-189: 지도 인스턴스 lifecycle 처리
// ==========================================
// - @ts-ignore 제거 (naver.d.ts 타입 선언으로 대체)
// - 지도 인스턴스 생성/해제는 useMap 훅이 담당
// - 이 컴포넌트는 표시와 에러 처리에만 집중

interface NaverMapProps {
  lat?: number;
  lng?: number;
  onMapReady?: (mapInstance: NaverMapInstance) => void;
}

export default function NaverMap({
  lat = 37.3595704,
  lng = 127.105399,
  onMapReady,
}: NaverMapProps) {
  const defaultCenter: Coordinates = { lat, lng };

  const { mapRef, mapInstance, sdkLoaded, sdkError } = useMap({ defaultCenter });

  // 지도 인스턴스가 준비되면 외부로 전달
  if (sdkLoaded && mapInstance.current && onMapReady) {
    onMapReady(mapInstance.current);
  }

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
      <div ref={mapRef} className="w-full h-full rounded-md shadow-inner" />
    </div>
  );
}
