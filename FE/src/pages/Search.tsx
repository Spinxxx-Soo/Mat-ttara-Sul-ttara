import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import KakaoMap from '@/components/map/KakaoMap'
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import { usePlaceDetail, useSearchPlaces, useSyncPlace } from '@/hooks/queries/place/usePlaces'
import { buildPlaceSyncRequest, getInternalPlaceId, getPlaceKey } from '@/lib/placeIdentity'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'

// ==========================================
// 레이아웃: [사이드바] | [가게 검색·결과 ↔ 리뷰] | [지도]
// ==========================================

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [reviewPanel, setReviewPanel] = useState<{
    placeId: number
    placeName: string
  } | null>(null)
  const [resolvedPlaceIds, setResolvedPlaceIds] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { lat: storeLat, lng: storeLng } = useLocationStore()
  const defaultLat = storeLat ?? 37.5665
  const defaultLng = storeLng ?? 126.978

  const [mapCenter, setMapCenter] = useState({ lat: defaultLat, lng: defaultLng })

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data, isLoading, error } = useSearchPlaces(
    {
      keyword: searchQuery || '',
      page,
      size: pageSize,
    },
    !!searchQuery
  )
  const { mutateAsync: syncPlace } = useSyncPlace()

  const places = data?.content ?? []
  const pageInfo = data?.pageInfo

  const placesForMap = useMemo(
    () =>
      places.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          !(p.lat === 0 && p.lng === 0)
      ),
    [places]
  )

  useEffect(() => {
    if (placesForMap.length === 0) return
    const first = placesForMap[0]
    setMapCenter({ lat: first.lat, lng: first.lng })
  }, [searchQuery, page, placesForMap])

  const selectedPlace = useMemo(
    () => places.find((p) => p.placeId === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />

      <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-primary/10 bg-white shadow-xl dark:border-slate-800 dark:bg-background-dark">
        <div className="flex-shrink-0 border-b border-primary/5 p-6">
          <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">맛따라 술따라</span>
            <span className="text-sm font-normal text-slate-500">가게 검색</span>
          </h1>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-none bg-background-light py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800"
              placeholder="가게 이름, 메뉴 또는 지역 검색"
            />
          </div>
        </div>

        {reviewPanel ? (
          <PlaceReviewPanel
            placeId={reviewPanel.placeId}
            placeName={reviewPanel.placeName}
            onBack={() => setReviewPanel(null)}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar">
            {isLoading && (
              <div className="p-4 text-center text-slate-500">검색 중...</div>
            )}
            {error && (
              <div className="p-4 text-center text-red-500">
                검색 중 오류가 발생했습니다.
              </div>
            )}
            {!isLoading && !error && places.length === 0 && searchQuery && (
              <div className="p-4 text-center text-slate-500">
                검색 결과가 없습니다.
              </div>
            )}
            {!isLoading && !error && !searchQuery && (
              <div className="p-4 text-center text-slate-500">
                검색어를 입력해주세요.
              </div>
            )}
            {places.map((place: Place) => (
              <div
                key={place.placeId}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPlaceId(place.placeId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    setSelectedPlaceId(place.placeId)
                }}
                className={`cursor-pointer border-b border-primary/5 p-4 transition-colors hover:bg-primary/5 group ${
                  selectedPlaceId === place.placeId ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-stretch gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 shadow-sm dark:bg-slate-700">
                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400">
                        restaurant
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="truncate font-bold text-slate-900 transition-colors group-hover:text-primary dark:text-slate-100">
                        {place.name}
                      </h3>
                      {place.rating != null && (
                        <div className="flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-900/30">
                          <span className="material-symbols-outlined text-[14px] fill-current">
                            star
                          </span>
                          {place.rating}
                        </div>
                      )}
                    </div>
                    {place.category && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        {place.category}
                      </p>
                    )}
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {place.address}
                    </p>
                    {place.phone && (
                      <p className="mt-0.5 text-xs text-slate-400">{place.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {pageInfo && pageInfo.totalPages > 1 && (
              <div className="flex justify-center gap-2 border-t border-primary/5 p-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded bg-primary/10 px-3 py-1 text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  {page} / {pageInfo.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(pageInfo.totalPages, p + 1))
                  }
                  disabled={!pageInfo.hasNext}
                  className="rounded bg-primary/10 px-3 py-1 text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1">
        <KakaoMap
          className="h-full w-full"
          lat={mapCenter.lat}
          lng={mapCenter.lng}
          places={placesForMap}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={handlePlaceClick}
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

export default Search
