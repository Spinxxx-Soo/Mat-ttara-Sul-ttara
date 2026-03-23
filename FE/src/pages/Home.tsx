import { Link } from 'react-router-dom';

import CopyLinkButton from '@/components/CopyLinkButton';
import Button from '@/components/ui/Button';
import KakaoMap from '@/components/map/KakaoMap';
import { useAuthStore } from '@/stores/authStore';
// TODO: Home.tsx의 plans 섹션은 개발 테스트용 임시 코드입니다. 실제 플랜 목록은 /my-plan 페이지 참고.
import { usePlansQuery } from '@/hooks/queries/plan/usePlanQueries';
import { useNearbyPlaces, useEnrichPlace } from '@/hooks/queries/place/usePlaces';
import { useMarkers } from '@/hooks/useMarkers';
import { useInfoWindow } from '@/hooks/useInfoWindow';
import { useGeolocation } from '@/hooks/useGeolocation';
import { mapPlacesToMarkerDataList } from '@/lib/placeMapper';
import { hasNullFields } from '@/lib/placeUtils';
import type { KakaoMapInstance } from '@/types/kakao.d';
import type { Coordinates, PlaceMarkerData } from '@/types/map';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { calculateDistance } from '@/utils/geoUtils';

const REFETCH_THRESHOLD_METERS = 100;

export default function Home() {
  const { isLoggedIn, logout } = useAuthStore();

  const { data: plansData, isPending: isPlansLoading } = usePlansQuery();
  const plans = plansData?.plans || [];

  const [mapInst, setMapInst] = useState<KakaoMapInstance | null>(null);
  
  // API 재조회 기준 중심점
  const [fetchCenter, setFetchCenter] = useState<Coordinates>({ lat: 37.3595704, lng: 127.105399 });

  const { data: places = [], isLoading: isPlacesLoading } = useNearbyPlaces(
    { lat: fetchCenter.lat, lng: fetchCenter.lng, radius: 1000 },
    !!mapInst
  );

  const { mutate: enrichPlace } = useEnrichPlace();

  const mappedPlaces = useMemo(() => {
    return mapPlacesToMarkerDataList(places || []);
  }, [places]);

  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  // places 갱신 시 선택 항목이 사라졌다면 선택 해제
  useEffect(() => {
    if (selectedPlaceId && mappedPlaces.length > 0) {
      const stillExists = mappedPlaces.some(p => p.id === selectedPlaceId);
      if (!stillExists) {
        setSelectedPlaceId(null);
        closeInfoWindow();
      }
    }
  }, [mappedPlaces, selectedPlaceId]);

  const { openInfoWindow, closeInfoWindow } = useInfoWindow(mapInst);

  const handleMarkerClick = useCallback((placeData: PlaceMarkerData, marker: any) => {
    setSelectedPlaceId(placeData.id);

    // Lazy Loading: 원본 Place 객체를 찾아 null 여부 확인
    const originalPlace = places.find(p => p.placeId === placeData.id);
    if (originalPlace && hasNullFields(originalPlace)) {
      enrichPlace(originalPlace.placeId);
    }

    const content = `
      <div style="padding:12px; min-width:150px; font-family:sans-serif;">
        <h3 style="margin:0 0 4px 0; font-size:16px; font-weight:bold;">${placeData.name}</h3>
        <p style="margin:0; font-size:12px; color:#666;">별점: ${placeData.rating || 'N/A'}</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#999; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${placeData.address}</p>
        <a href="/places/${placeData.id}" style="display:inline-block; margin-top:8px; font-size:12px; color:#3b82f6; text-decoration:none;">자세히 보기 &rarr;</a>
      </div>
    `;
    openInfoWindow(marker, content);
  }, [openInfoWindow, places, enrichPlace]);

  const { markers } = useMarkers({
    mapInstance: mapInst,
    places: mappedPlaces,
    selectedPlaceId,
    onMarkerClick: handleMarkerClick,
  });

  const handleMapIdle = useCallback((center: Coordinates) => {
    // 100m 이상 이동 시 새로운 중심점으로 재조회 트리거
    setFetchCenter((prev) => {
      const distance = calculateDistance(prev.lat, prev.lng, center.lat, center.lng);
      if (distance > REFETCH_THRESHOLD_METERS) {
        return center;
      }
      return prev;
    });
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedPlaceId(null);
    closeInfoWindow();
  }, [closeInfoWindow]);

  const { coordinates: geoCoords, fetchLocation, isLoading: isGeoLoading } = useGeolocation(false);

  useEffect(() => {
    if (geoCoords && mapInst) {
      mapInst.setCenter(new window.kakao.maps.LatLng(geoCoords.lat, geoCoords.lng));
      setFetchCenter(geoCoords); // 지오로케이션 이동 시 재조회를 위해 fetchCenter도 갱신
    }
  }, [geoCoords, mapInst]);

  // 리스트 아이템 클릭 시
  const handleListItemClick = useCallback((placeData: PlaceMarkerData) => {
    setSelectedPlaceId(placeData.id);
    
    // Lazy Loading: 원본 Place 객체를 찾아 null 여부 확인
    const originalPlace = places.find(p => p.placeId === placeData.id);
    if (originalPlace && hasNullFields(originalPlace)) {
      enrichPlace(originalPlace.placeId);
    }

    if (mapInst) {
      // 해당 마커 위치로 카메라 부드럽게 이동
      mapInst.panTo(new window.kakao.maps.LatLng(placeData.position.lat, placeData.position.lng));
      
      // 마커 객체를 찾아 정보창 열기
      const targetMarker = markers[placeData.id];
      if (targetMarker) {
        const content = `
          <div style="padding:12px; min-width:150px; font-family:sans-serif;">
            <h3 style="margin:0 0 4px 0; font-size:16px; font-weight:bold;">${placeData.name}</h3>
            <p style="margin:0; font-size:12px; color:#666;">별점: ${placeData.rating || 'N/A'}</p>
            <p style="margin:4px 0 0 0; font-size:12px; color:#999; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${placeData.address}</p>
            <a href="/places/${placeData.id}" style="display:inline-block; margin-top:8px; font-size:12px; color:#3b82f6; text-decoration:none;">자세히 보기 &rarr;</a>
          </div>
        `;
        openInfoWindow(targetMarker, content);
      }
    }
  }, [mapInst, markers, openInfoWindow, places, enrichPlace]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">FE Dashboard</h1>
        <nav className="space-x-4">
          <Link to="/plan/1" className="text-blue-500 hover:underline">디테일 뷰(테스트)</Link>
          {isLoggedIn ? (
            <Button variant="danger" size="sm" onClick={logout}>로그아웃</Button>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">로그인</Button>
            </Link>
          )}
        </nav>
      </header>

      <main className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">전체 플랜 목록</h2>
          {isPlansLoading ? (
            <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
          ) : plans.length === 0 ? (
            <p className="text-gray-500 italic">등록된 플랜이 없습니다.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {plans.map((plan) => (
                <li key={plan.id} className="text-gray-800">
                  <span className="font-semibold">{plan.title}</span> - {plan.memo || '메모 없음'}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Kakao Map Integration (주변 장소)</h2>
            {isPlacesLoading && <span className="text-sm text-gray-400">검색 중...</span>}
          </div>
          <p className="text-sm text-gray-500 mb-4">지도를 움직여 새로운 장소를 탐색하세요. 마커나 리스트를 클릭하면 동기화됩니다.</p>
          
          <div className="flex flex-col md:flex-row gap-4 h-[500px]">
            {/* 좌측 리스트 뷰 */}
            <div className="w-full md:w-1/3 bg-white border rounded-md shadow-sm overflow-y-auto flex flex-col">
              <div className="p-4 border-b bg-gray-50 sticky top-0">
                <h3 className="font-semibold text-gray-700">검색된 장소 ({mappedPlaces.length})</h3>
              </div>
              <ul className="flex-1">
                {mappedPlaces.length === 0 ? (
                  <li className="p-4 text-center text-gray-500 text-sm">결과가 없습니다.</li>
                ) : (
                  mappedPlaces.map((place) => (
                    <li 
                      key={place.id}
                      onClick={() => handleListItemClick(place)}
                      className={`p-4 border-b cursor-pointer transition-colors ${
                        selectedPlaceId === place.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <h4 className={`font-medium ${selectedPlaceId === place.id ? 'text-blue-700' : 'text-gray-800'}`}>
                        {place.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 truncate">{place.address}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* 우측 지도 뷰 */}
            <div className="relative w-full md:w-2/3 h-full">
              <KakaoMap 
                onMapReady={setMapInst} 
                onIdle={handleMapIdle} 
                onClick={handleMapClick}
              />
              {/* 내 주변 버튼 */}
              <button 
                className={`absolute bottom-6 right-4 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors ${isGeoLoading ? 'animate-pulse' : ''}`}
                onClick={() => fetchLocation()}
                title="내 위치로 이동"
                disabled={isGeoLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Share Link</h2>
          <CopyLinkButton
            linkUrl={window.location.href}
          />
        </section>
      </main>
    </div>
  );
}
