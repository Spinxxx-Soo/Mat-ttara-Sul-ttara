import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import NaverMap from '@/components/map/NaverMap'
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard'
import { useNearbyPlaces } from '@/hooks/queries/place/usePlaces'
import { useLocationStore } from '@/stores/locationStore'
import type { Place } from '@/types/api'

// ==========================================
// 레이아웃: [사이드바] | [AI 플래너 ↔ 리뷰] | [지도]
// 핀 클릭 → 상세 카드 → 리뷰 보기 → 왼쪽 패널이 리뷰로 전환
// ==========================================

const Main = () => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [reviewPanel, setReviewPanel] = useState<{
    placeId: number
    placeName: string
  } | null>(null)

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

  const selectedPlace = useMemo(
    () => restaurants.find((p) => p.placeId === selectedPlaceId) ?? null,
    [restaurants, selectedPlaceId]
  )

  const handlePlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)
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
    setReviewPanel({
      placeId: selectedPlace.placeId,
      placeName: selectedPlace.name,
    })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Sidebar />

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

      <main className="relative min-h-0 min-w-0 flex-1">
        <NaverMap
          className="h-full w-full"
          lat={currentLat}
          lng={currentLng}
          places={restaurants}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={handlePlaceClick}
          onIdle={handleMapIdle}
        />

        {selectedPlace && !reviewPanel && (
          <PlaceMapDetailCard
            place={selectedPlace}
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
  )
}

export default Main
