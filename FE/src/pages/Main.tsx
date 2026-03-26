// FE/src/pages/Main.tsx

import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import KakaoMap from '@/components/map/KakaoMap'
import { useEnrichPlace, useNearbyPlaces, usePlaceDetail } from '@/hooks/queries/place/usePlaces'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'
import { mergeByPlaceId, useChatMapStore } from '@/stores/chatMapStore'
import { hasNullFields } from '@/lib/placeUtils'
import { placeApi } from '@/api/placeApi'
import { extractApiErrorMessage } from '@/lib/apiUtils'

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

  const upsertPlaceMutation = useMutation({
    mutationFn: async (place: Place) =>
      placeApi.upsertPlace({
        provider: 'KAKAO',
        externalPlaceId: String(place.placeId),
        name: place.name,
        address: place.address,
        phone: place.phone ?? null,
        lat: place.lat,
        lng: place.lng,
        category: place.category ?? null,
        imageUrl: place.imageUrl ?? null,
      }),
    onSuccess: (res, place) => {
      setReviewPanel({
        placeId: res.placeId,
        placeName: place.name,
      })
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err, '장소 저장에 실패했습니다.'))
    },
  })

  const openReviewFromDetail = () => {
    if (!selectedPlace) return

    const reviewsEnabled = import.meta.env.VITE_REVIEWS_ENABLED === 'true'
    if (!reviewsEnabled) {
      toast.error('리뷰 기능은 준비 중입니다.')
      return
    }

    if (upsertPlaceMutation.isPending) return
    upsertPlaceMutation.mutate(selectedPlace)
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
          detailPlace={
            selectedPlace && !reviewPanel ? (selectedPlaceForDisplay ?? selectedPlace) : null
          }
          onDetailClose={() => setSelectedPlaceId(null)}
          onDetailReviewClick={openReviewFromDetail}
          onPlaceClick={handlePlaceClick}
          onIdle={handleMapIdle}
        />
      </main>
    </div>
  )
}

export default Main
