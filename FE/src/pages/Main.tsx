// FE/src/pages/Main.tsx

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import KakaoMap from '@/components/map/KakaoMap'
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard'
import { useNearbyPlaces, usePlaceDetail, useSyncPlace } from '@/hooks/queries/place/usePlaces'
import { buildPlaceSyncRequest, getInternalPlaceId, getPlaceKey } from '@/lib/placeIdentity'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'
import { mergeByPlaceId, useChatMapStore } from '@/stores/chatMapStore'

const Main = () => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [reviewPanel, setReviewPanel] = useState<{
    placeId: number
    placeName: string
  } | null>(null)
  const [resolvedPlaceIds, setResolvedPlaceIds] = useState<Record<string, number>>({})

  const { lat: storeLat, lng: storeLng } = useLocationStore()
  const currentLat = storeLat ?? 37.5665
  const currentLng = storeLng ?? 126.978

  const [mapCenter, setMapCenter] = useState({ lat: currentLat, lng: currentLng })
  const [zoom, setZoom] = useState(15)

  const { data: restaurants = [], isLoading } = useNearbyPlaces(
    {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      radius: zoom > 14 ? 1000 : 2000,
    },
    true
  )
  const { mutateAsync: syncPlace } = useSyncPlace()

  const categories = ['전체', '한식', '일식', '중식', '양식', '카페', '술집']

  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === '전체') return restaurants
    return restaurants.filter((r) => r.category === selectedCategory)
  }, [restaurants, selectedCategory])

  const aiRecommendedPlaces = useChatMapStore((s) => s.aiRecommendedPlaces)
  const mapPlaces = useMemo(() => {
    return mergeByPlaceId(filteredRestaurants, aiRecommendedPlaces)
  }, [filteredRestaurants, aiRecommendedPlaces])

  const selectedPlace = useMemo(() => {
    if (selectedPlaceId == null) return null
    return mapPlaces.find((p) => p.placeId === selectedPlaceId) ?? null
  }, [mapPlaces, selectedPlaceId])

  const selectedPlaceKey = selectedPlace ? getPlaceKey(selectedPlace) : null
  const selectedInternalPlaceId = selectedPlace
    ? (getInternalPlaceId(selectedPlace) ?? (selectedPlaceKey ? resolvedPlaceIds[selectedPlaceKey] ?? null : null))
    : null

  useEffect(() => {
    let cancelled = false

    if (!selectedPlace || selectedPlaceKey == null) {
      return
    }

    if (selectedInternalPlaceId != null) {
      return
    }

    const run = async () => {
      try {
        const response = await syncPlace(buildPlaceSyncRequest(selectedPlace))
        if (!response || cancelled) return

        setResolvedPlaceIds((prev) => ({
          ...prev,
          [selectedPlaceKey]: response.placeId,
        }))
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to sync selected place:', error)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [selectedInternalPlaceId, selectedPlace, selectedPlaceKey, syncPlace])

  const { data: selectedPlaceDetail } = usePlaceDetail(
    selectedInternalPlaceId ?? 0,
    selectedInternalPlaceId != null,
  )
  const selectedPlaceForDisplay = selectedPlaceDetail ?? selectedPlace

  const handlePlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)
  }

  // 리스트 클릭 시 목록/지도를 함께 동기화하기 위해 중심 이동도 수행
  const handleListPlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)
    setMapCenter({ lat: place.lat, lng: place.lng })
  }

  const handleMapIdle = (
    center: { lat: number; lng: number },
    currentZoom: number
  ) => {
    setMapCenter(center)
    setZoom(currentZoom)
  }

  const openReviewFromDetail = () => {
    if (!selectedPlace) return
    if (selectedInternalPlaceId == null) {
      toast.error('장소 정보를 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    const reviewsEnabled = import.meta.env.VITE_REVIEWS_ENABLED === 'true'
    if (!reviewsEnabled) {
      toast.error('리뷰 기능은 준비 중입니다.')
      return
    }

    setReviewPanel({
      placeId: selectedInternalPlaceId,
      placeName: selectedPlace.name,
    })
  }

  // 카테고리 변경/추천 변화로 선택 장소가 목록에서 사라지면 상세 카드만 닫음
  useEffect(() => {
    if (selectedPlaceId == null) return
    if (!mapPlaces.some((p) => p.placeId === selectedPlaceId)) {
      setSelectedPlaceId(null)
    }
  }, [mapPlaces, selectedPlaceId])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Sidebar />

      {/* 왼쪽: ChatWidget 또는 ReviewPanel */}
      <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl z-40 dark:border-slate-800">
        {reviewPanel ? (
          <PlaceReviewPanel
            placeId={reviewPanel.placeId}
            placeName={reviewPanel.placeName}
            onBack={() => setReviewPanel(null)}
          />
        ) : (
          <ChatWidget />
        )}
      </aside>

      {/* 가운데: 카테고리/목록 패널 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-[400px] h-full bg-white border-r border-slate-200 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20">
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

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
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
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-400">최적의 맛집을 찾는 중...</p>
              </div>
            ) : mapPlaces.length > 0 ? (
              mapPlaces.map((place) => (
                <div
                  key={place.placeId}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleListPlaceClick(place)}
                  className={`group bg-white p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    selectedPlaceId === place.placeId
                      ? 'border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]'
                      : 'border-slate-100 hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3
                        className={`font-black tracking-tight transition-colors ${
                          selectedPlaceId === place.placeId
                            ? 'text-primary'
                            : 'text-slate-800 group-hover:text-primary'
                        }`}
                      >
                        {place.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {place.category || '음식점'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-amber-400 text-[16px] fill-amber-400">
                        star
                      </span>
                      <span className="text-xs font-black text-amber-700">
                        {place.rating ?? 0.0}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4 line-clamp-1 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[18px] text-slate-300">
                      location_on
                    </span>
                    {place.address}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      영업 중
                    </span>
                    <button
                      type="button"
                      className="text-slate-400 group-hover:text-primary p-1 rounded-full hover:bg-primary/5 transition-all"
                      aria-label="상세 보기"
                    >
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
                <p className="text-slate-400 text-xs leading-relaxed">
                  지도를 이동하거나 다른 카테고리를<br />
                  선택해 보세요.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* 오른쪽: 지도 */}
        <main className="relative min-h-0 min-w-0 flex-1">
          <KakaoMap
            className="h-full w-full"
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onPlaceClick={handlePlaceClick}
            onIdle={handleMapIdle}
          />

          {selectedPlace && !reviewPanel && (
            <PlaceMapDetailCard
              place={selectedPlaceForDisplay ?? selectedPlace}
              onClose={() => setSelectedPlaceId(null)}
              onReviewClick={openReviewFromDetail}
            />
          )}

          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
            <button
              type="button"
              disabled={isLoading}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-100 bg-white px-6 py-2.5 font-bold text-slate-700 shadow-xl hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              이 주변 맛집 재검색
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Main
