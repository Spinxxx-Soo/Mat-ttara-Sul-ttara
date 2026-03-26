import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import KakaoMap from '@/components/map/KakaoMap'
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import {
  useNearbyPlaces,
  usePlaceDetail,
  useSearchPlaces,
  useSyncPlace,
} from '@/hooks/queries/place/usePlaces'
import { buildPlaceSyncRequest, getInternalPlaceId, getPlaceKey } from '@/lib/placeIdentity'
import { mergeByPlaceId } from '@/stores/chatMapStore'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'

// ==========================================
// 레이아웃: [사이드바] | [가게 검색·결과 ↔ 리뷰] | [지도]
// ==========================================

const Search = () => {
  const [searchInput, setSearchInput] = useState('')
  const [committedKeyword, setCommittedKeyword] = useState('')
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

  /** 지도에 넘겨 의도적으로 이동할 좌표 */
  const [mapCenter, setMapCenter] = useState({ lat: defaultLat, lng: defaultLng })

  /** 지도 이동 시점 뷰포트 (검색/재검색 anchor에 반영) */
  const mapViewportRef = useRef({
    lat: defaultLat,
    lng: defaultLng,
    zoom: 15,
  })

  /** 검색 호출 기준 좌표 (키워드 검색할 때 mapViewportRef 스냅샷 사용) */
  const [searchOrigin, setSearchOrigin] = useState({ lat: defaultLat, lng: defaultLng })

  /** 주변 맛집 API 기준 좌표/줌 — 버튼으로 검색 */
  const [nearbySearchRequested, setNearbySearchRequested] = useState(false)
  const [nearbyAnchor, setNearbyAnchor] = useState({
    lat: defaultLat,
    lng: defaultLng,
    zoom: 15,
  })

  const nearbyRadius = nearbyAnchor.zoom > 14 ? 1000 : 2000
  const { data: nearbyData, isLoading: isNearbyLoading, refetch: refetchNearby } = useNearbyPlaces(
    {
      lat: nearbyAnchor.lat,
      lng: nearbyAnchor.lng,
      radius: nearbyRadius,
    },
    nearbySearchRequested,
  )
  const nearbyRestaurants = nearbySearchRequested ? (nearbyData ?? []) : []

  useEffect(() => {
    setPage(1)
  }, [committedKeyword])

  const { data, isLoading, error, refetch: refetchSearch } = useSearchPlaces(
    {
      keyword: committedKeyword || '',
      page,
      size: pageSize,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
    },
    !!committedKeyword,
  )

  const places = committedKeyword ? (data?.content ?? []) : []
  const pageInfo = data?.pageInfo

  const placesForMap = useMemo(
    () =>
      places.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          !(p.lat === 0 && p.lng === 0),
      ),
    [places],
  )

  const nearbyForMap = useMemo(
    () =>
      nearbyRestaurants.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          !(p.lat === 0 && p.lng === 0),
      ),
    [nearbyRestaurants],
  )

  const mapPlaces = useMemo(() => mergeByPlaceId(placesForMap, nearbyForMap), [placesForMap, nearbyForMap])

  useEffect(() => {
    if (placesForMap.length === 0) return
    const first = placesForMap[0]
    setMapCenter({ lat: first.lat, lng: first.lng })
  }, [committedKeyword, page, placesForMap])

  const selectedPlace = useMemo(() => {
    if (selectedPlaceId == null) return null
    return places.find((p) => p.placeId === selectedPlaceId) ?? mapPlaces.find((p) => p.placeId === selectedPlaceId) ?? null
  }, [places, mapPlaces, selectedPlaceId])

  const selectedPlaceKey = selectedPlace ? getPlaceKey(selectedPlace) : null
  const selectedInternalPlaceId = selectedPlace
    ? (getInternalPlaceId(selectedPlace) ??
      (selectedPlaceKey ? resolvedPlaceIds[selectedPlaceKey] ?? null : null))
    : null

  const { mutateAsync: syncPlace } = useSyncPlace()

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

  const handleListPlaceClick = (place: Place) => {
    setSelectedPlaceId(place.placeId)
    if (
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng) &&
      !(place.lat === 0 && place.lng === 0)
    ) {
      setMapCenter({ lat: place.lat, lng: place.lng })
    }
  }

  const handleMapIdle = (center: { lat: number; lng: number }, currentZoom: number) => {
    mapViewportRef.current = {
      lat: center.lat,
      lng: center.lng,
      zoom: currentZoom,
    }
  }

  const submitStoreSearch = () => {
    const next = mapViewportRef.current
    const nextOrigin = { lat: next.lat, lng: next.lng }
    const nextQuery = searchInput.trim()

    setSearchOrigin(nextOrigin)
    setPage(1)

    if (nextQuery && nextQuery === committedKeyword) {
      const sameOrigin =
        Math.abs(nextOrigin.lat - searchOrigin.lat) < 1e-7 &&
        Math.abs(nextOrigin.lng - searchOrigin.lng) < 1e-7
      if (sameOrigin) {
        void refetchSearch()
      }
      return
    }

    setCommittedKeyword(nextQuery)
  }

  const handleRefreshNearby = () => {
    const v = mapViewportRef.current
    const next = { lat: v.lat, lng: v.lng, zoom: v.zoom }
    const same =
      nearbySearchRequested &&
      Math.abs(next.lat - nearbyAnchor.lat) < 1e-7 &&
      Math.abs(next.lng - nearbyAnchor.lng) < 1e-7 &&
      next.zoom === nearbyAnchor.zoom

    setNearbySearchRequested(true)
    setNearbyAnchor(next)
    if (same) {
      void refetchNearby()
    }
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

  useEffect(() => {
    if (selectedPlaceId == null) return
    if (!mapPlaces.some((p) => p.placeId === selectedPlaceId)) {
      setSelectedPlaceId(null)
    }
  }, [mapPlaces, selectedPlaceId])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />

      <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-primary/10 bg-white shadow-xl dark:border-slate-800 dark:bg-background-dark">
        <div className="flex-shrink-0 border-b border-primary/5 p-6">
          <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">맛따라 술따라</span>
            <span className="text-sm font-normal text-slate-500">가게 검색</span>
          </h1>
          <form
            className="relative flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submitStoreSearch()
            }}
          >
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border-none bg-background-light py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800"
              placeholder="가게 이름, 메뉴 또는 지역 검색"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-md shadow-primary/20 hover:opacity-95"
            >
              검색
            </button>
          </form>
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
              <div className="p-4 text-center text-red-500">검색 중 오류가 발생했습니다.</div>
            )}
            {!isLoading && !error && places.length === 0 && committedKeyword && (
              <div className="p-4 text-center text-slate-500">검색 결과가 없습니다.</div>
            )}
            {!isLoading && !error && !committedKeyword && (
              <div className="p-4 text-center text-slate-500">
                검색어를 입력한 뒤 검색 버튼을 눌러주세요.
              </div>
            )}
            {places.map((place: Place) => (
              <div
                key={getPlaceKey(place)}
                role="button"
                tabIndex={0}
                onClick={() => handleListPlaceClick(place)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleListPlaceClick(place)
                  }
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
                        <div className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-900/30">
                          <span className="material-symbols-outlined fill-current text-[14px]">
                            star
                          </span>
                          {place.rating}
                        </div>
                      )}
                    </div>
                    {place.category && <p className="mt-1 text-xs font-medium text-primary">{place.category}</p>}
                    <p className="mt-1 truncate text-xs text-slate-500">{place.address}</p>
                    {place.phone && <p className="mt-0.5 text-xs text-slate-400">{place.phone}</p>}
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
          places={mapPlaces}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={handlePlaceClick}
          onIdle={handleMapIdle}
        />

        {isNearbyLoading && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs text-slate-500 shadow">
            주변 맛집을 검색 중입니다.
          </div>
        )}

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
            onClick={handleRefreshNearby}
            disabled={isNearbyLoading}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-100 bg-white px-6 py-2.5 font-bold text-slate-700 shadow-xl hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            이 주변 맛집 재검색
          </button>
        </div>
      </main>
    </div>
  )
}

export default Search
