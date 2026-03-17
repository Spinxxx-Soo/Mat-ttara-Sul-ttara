import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import CopyLinkButton from '@/components/CopyLinkButton';
import Button from '@/components/ui/Button';
import NaverMap from '@/components/map/NaverMap';
import { useAuthStore } from '@/stores/authStore';
import { Plan } from '@/types/plan';
import { useNearbyPlaces } from '@/hooks/queries/place/usePlaces';
import { useMarkers } from '@/hooks/useMarkers';
import { useInfoWindow } from '@/hooks/useInfoWindow';
import { useGeolocation } from '@/hooks/useGeolocation';
import { mapPlacesToMarkerDataList } from '@/lib/placeMapper';
import type { NaverMapInstance } from '@/types/naver.d';
import type { Coordinates, PlaceMarkerData } from '@/types/map';
import { useState, useCallback, useEffect, useMemo } from 'react';

export default function Home() {
  const { isLoggedIn, logout } = useAuthStore();

  // Polling MVP: 데이터 refetch 간격(10초)으로 셋팅
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      // 실제 프로젝트에서는 axios apiClient 훅 연동
      // const response = await apiClient.get('/api/plans');
      // return response.data;
      return [
        { id: '1', title: 'Plan A', description: 'MVP 첫 번째 플랜', createdAt: '', updatedAt: '' },
      ];
    },
    refetchInterval: 10000,
  });

  const [mapInst, setMapInst] = useState<NaverMapInstance | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 37.3595704, lng: 127.105399 });

  const { data: places, isLoading: isPlacesLoading } = useNearbyPlaces(
    { lat: mapCenter.lat, lng: mapCenter.lng, radius: 1000 },
    !!mapInst
  );

  const mappedPlaces = useMemo(() => {
    return mapPlacesToMarkerDataList(places || []);
  }, [places]);

  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  const { openInfoWindow, closeInfoWindow } = useInfoWindow(mapInst);

  const handleMarkerClick = useCallback((place: PlaceMarkerData, marker: any) => {
    setSelectedPlaceId(place.id);

    const content = `
      <div style="padding:12px; min-width:150px; font-family:sans-serif;">
        <h3 style="margin:0 0 4px 0; font-size:16px; font-weight:bold;">${place.name}</h3>
        <p style="margin:0; font-size:12px; color:#666;">별점: ${place.rating || 'N/A'}</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#999; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${place.address}</p>
        <a href="/places/${place.id}" style="display:inline-block; margin-top:8px; font-size:12px; color:#3b82f6; text-decoration:none;">자세히 보기 &rarr;</a>
      </div>
    `;
    openInfoWindow(marker, content);
  }, [openInfoWindow]);

  useMarkers({
    mapInstance: mapInst,
    places: mappedPlaces,
    selectedPlaceId,
    onMarkerClick: handleMarkerClick,
  });

  const handleMapIdle = useCallback((center: Coordinates) => {
    setMapCenter(center);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedPlaceId(null);
    closeInfoWindow();
  }, [closeInfoWindow]);

  const { coordinates: geoCoords, fetchLocation, isLoading: isGeoLoading } = useGeolocation(false);

  useEffect(() => {
    if (geoCoords && mapInst) {
      mapInst.setCenter(new window.naver.maps.LatLng(geoCoords.lat, geoCoords.lng));
      setMapCenter(geoCoords);
    }
  }, [geoCoords, mapInst]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
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
          <h2 className="text-xl font-semibold mb-4 text-gray-700">React Query + Polling</h2>
          {isLoading ? (
            <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {plans?.map((plan: Plan) => (
                <li key={plan.id} className="text-gray-800">
                  <span className="font-semibold">{plan.title}</span> - {plan.description}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Naver Map Integration (주변 장소)</h2>
            {isPlacesLoading && <span className="text-sm text-gray-400">검색 중...</span>}
          </div>
          <p className="text-sm text-gray-500 mb-2">지도를 움직여 새로운 장소를 탐색하세요. 마커를 클릭하면 팝업이 뜹니다.</p>
          <div className="relative">
            <NaverMap 
              onMapReady={setMapInst} 
              onIdle={handleMapIdle} 
              onClick={handleMapClick}
            />
            {/* 내 주변 버튼 */}
            <button 
              className={`absolute bottom-6 right-4 z-10 bg-white p-3 rounded-full shadow hover:bg-gray-50 transition-colors ${isGeoLoading ? 'animate-pulse' : ''}`}
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
