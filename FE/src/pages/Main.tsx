// FE/src/pages/Main.tsx

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import KakaoMap from '@/components/map/KakaoMap'
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard'
import { useEnrichPlace, useNearbyPlaces, usePlaceDetail } from '@/hooks/queries/place/usePlaces'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'
import { mergeByPlaceId, useChatMapStore } from '@/stores/chatMapStore'
import { hasNullFields } from '@/lib/placeUtils'

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

  const { data: restaurants = [] } = useNearbyPlaces(
    {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      radius: zoom > 14 ? 1000 : 2000,
    },
    true
  )

  const { mutate: enrichPlace } = useEnrichPlace()

  const aiRecommendedPlaces = useChatMapStore((s) => s.aiRecommendedPlaces)
  const mapPlaces = useMemo(() => {
    return mergeByPlaceId(restaurants, aiRecommendedPlaces)
  }, [restaurants, aiRecommendedPlaces])

  const selectedPlace = useMemo(() => {
    if (selectedPlaceId == null) return null
    return mapPlaces.find((p) => p.placeId === selectedPlaceId) ?? null
  }, [mapPlaces, selectedPlaceId])

  const { data: selectedPlaceDetail } = usePlaceDetail(selectedPlaceId ?? 0, selectedPlaceId != null)
  const selectedPlaceForDisplay = selectedPlaceDetail ?? selectedPlace

  const handlePlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)

    if (hasNullFields(place)) {
      enrichPlace(place.placeId)
    }
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

    const reviewsEnabled = import.meta.env.VITE_REVIEWS_ENABLED === 'true'
    if (!reviewsEnabled) {
      toast.error('리뷰 기능은 준비 중입니다.')
      return
    }

    setReviewPanel({
      placeId: selectedPlace.placeId,
      placeName: selectedPlace.name,
    })
  }

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

      {/* 오른쪽: 지도 (주변 맛집 목록은 /search) */}
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
      </main>
    </div>
  )
}

export default Main
