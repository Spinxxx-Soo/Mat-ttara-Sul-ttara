import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import KakaoMap from '@/components/map/KakaoMap'
import { useNearbyPlaces, useEnrichPlace } from '@/hooks/queries/place/usePlaces'
import { useLocationStore } from '@/stores/locationStore'
import { hasNullFields } from '@/lib/placeUtils'
import type { Place } from '@/types/api'

// ==========================================
// S14P21B205-128: 지도 초기화와 현재 위치 표시
// S14P21B205-129: 지도와 장소 데이터 연동 구현
// S14P21B205-197: 리스트-마커 연계 동작 구현
// S14P21B205-198: 지도 중심 기반 재조회 (onIdle 연계)
// S14P21B205-LazyLoading: 장소 클릭 시 부족한 정보 크롤링 보강
// ==========================================

const Main = () => {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  
  // 현재 내 위치 (store)
  const { lat: storeLat, lng: storeLng } = useLocationStore()
  const currentLat = storeLat ?? 37.5665 // 서울 (또는 FALLBACK_LOCATION)
  const currentLng = storeLng ?? 126.9780
  
  // 지도의 현재 중심 (재조회용)
  const [mapCenter, setMapCenter] = useState({ lat: currentLat, lng: currentLng })
  
  // 지도의 현재 줌 (기본값 15)
  const [zoom, setZoom] = useState(15)

  // 주변 장소 데이터 조회 (실제 API 연동)
  const { data: restaurants = [], isLoading } = useNearbyPlaces({
    lat: mapCenter.lat,
    lng: mapCenter.lng,
    radius: zoom > 14 ? 1000 : 2000 // 줌 레벨에 따라 검색 반경 조절 (zoom 활용)
  }, true)

  // 크롤링 보강을 위한 뮤테이션
  const { mutate: enrichPlace } = useEnrichPlace()

  const categories = ['전체', '한식', '일식', '중식', '양식', '카페', '술집']

  // 카테고리 필터링 (클라이언트 사이드)
  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === '전체') return restaurants
    return restaurants.filter(r => r.category === selectedCategory)
  }, [restaurants, selectedCategory])

  const handlePlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)
    
    // Lazy Loading 전략: 정보가 부족하면 크롤링 요청
    if (hasNullFields(place)) {
      console.log(`[LazyLoading] Enriching data for place: ${place.name} (${place.placeId})`);
      enrichPlace(place.placeId);
    }
  }

  const handleMapIdle = (center: { lat: number, lng: number }, currentZoom: number) => {
    // 지도가 이동하여 멈췄을 때 중심 좌표 업데이트 -> useNearbyPlaces 재발생
    setMapCenter(center)
    setZoom(currentZoom)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Sidebar />
      
      <main className="flex-1 flex overflow-hidden relative">
        {/* Map Section (S14P21B205-128, 129) */}
        <section className="flex-1 relative">
          <KakaoMap 
            className="w-full h-full"
            lat={currentLat}
            lng={currentLng}
            places={filteredRestaurants}
            selectedPlaceId={selectedPlaceId}
            onPlaceClick={handlePlaceClick}
            onIdle={handleMapIdle}
          />
          
          {/* 하단 플로팅 오버레이 (버튼 등) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <button className="px-6 py-2.5 bg-white text-slate-700 rounded-full shadow-xl font-bold hover:bg-slate-50 transition-all border border-slate-100 flex items-center gap-2 group">
              <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">refresh</span>
              이 주변 맛집 재검색
            </button>
          </div>
        </section>

        {/* Places List Sidebar (S14P21B205-197) */}
        <aside className="w-[400px] h-full bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20">
          <div className="p-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">explore</span>
                주변 맛집 발견
              </h2>
              <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                <span className="material-symbols-outlined text-[22px]">tune</span>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-400">최적의 맛집을 찾는 중...</p>
              </div>
            ) : filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((place) => (
                <div
                  key={place.placeId}
                  onClick={() => handlePlaceClick(place)}
                  className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    selectedPlaceId === place.placeId
                      ? 'border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]'
                      : 'border-slate-100 hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={`font-black tracking-tight transition-colors ${
                        selectedPlaceId === place.placeId ? 'text-primary' : 'text-slate-800 group-hover:text-primary'
                      }`}>
                        {place.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{place.category || '음식점'}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-amber-400 text-[16px] fill-amber-400">
                        star
                      </span>
                      <span className="text-xs font-black text-amber-700">{place.rating || '0.0'}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-4 line-clamp-1 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[18px] text-slate-300">location_on</span>
                    {place.address}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      영업 중
                    </span>
                    <button className="text-slate-400 group-hover:text-primary p-1 rounded-full hover:bg-primary/5 transition-all">
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <span className="material-symbols-outlined text-slate-300 text-[32px]">no_meals</span>
                </div>
                <h4 className="font-bold text-slate-700 mb-1">장소가 없습니다</h4>
                <p className="text-slate-400 text-xs leading-relaxed">지도를 이동하거나 다른 카테고리를<br/>선택해 보세요.</p>
              </div>
            )}
          </div>
        </aside>
      </main>

      <ChatWidget />
    </div>
  )
}

export default Main
