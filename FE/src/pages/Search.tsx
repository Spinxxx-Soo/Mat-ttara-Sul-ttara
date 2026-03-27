import { useState, useEffect, useMemo, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import KakaoMap from '@/components/map/KakaoMap'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import {
  useNearbyPlaces,
  usePlaceDetail,
  useSearchPlaces,
  useSyncPlace,
} from '@/hooks/queries/place/usePlaces'
import { buildPlaceSyncRequest, getInternalPlaceId, getPlaceKey } from '@/lib/placeIdentity'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'
import { mergeByPlaceId } from '@/stores/chatMapStore'
import { extractApiErrorMessage } from '@/lib/apiUtils'

// ==========================================
// 가게 검색: keyword + page + size + 지도 중심(lat/lng) → 카카오 반경·거리순(placeApi)
// 검색 버튼으로만 조회·재검색
// 레이아웃: [사이드바] | [가게 검색·결과 ↔ 리뷰] | [주변 맛집 발견] | [지도]
// ==========================================

const Search = () => {
  const [searchInput, setSearchInput] = useState('')
  const [committedKeyword, setCommittedKeyword] = useState('')
  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null)
  const [reviewPanel, setReviewPanel] = useState<{
    placeId: number
    placeName: string
  } | null>(null)
  const [resolvedPlaceIds, setResolvedPlaceIds] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selectedCategory, setSelectedCategory] = useState('전체')

  const { lat: storeLat, lng: storeLng } = useLocationStore()
  const defaultLat = storeLat ?? 37.5665
  const defaultLng = storeLng ?? 126.978

  /** 지도에 넘겨 “의도적으로” 이동시킬 때만 갱신 (idle로는 갱신하지 않음) */
  const [mapCenter, setMapCenter] = useState({ lat: defaultLat, lng: defaultLng })

  /** 주변 맛집 API 기준 좌표·줌 — 「이 주변 맛집 재검색」으로만 갱신 */
  const [nearbyAnchor, setNearbyAnchor] = useState({
    lat: defaultLat,
    lng: defaultLng,
    zoom: 15,
  })

  /** 한 번도 주변 검색을 누르지 않았으면 API 호출·패널 목록 없음 */
  const [nearbySearchRequested, setNearbySearchRequested] = useState(false)

  /** 지도를 움직인 현재 뷰포트 (재검색 버튼에서만 nearbyAnchor로 반영) */
  const mapViewportRef = useRef({
    lat: defaultLat,
    lng: defaultLng,
    zoom: 15,
  })

  /** 검색 시점 지도 중심 — 검색 버튼 클릭 시 mapViewportRef 스냅샷으로 갱신 (placeApi에 lat/lng 전달) */
  const [searchOrigin, setSearchOrigin] = useState({ lat: defaultLat, lng: defaultLng })

  const nearbyRadius = nearbyAnchor.zoom > 14 ? 1000 : 2000

  const { data: nearbyData, isLoading: isNearbyLoading, refetch: refetchNearby } =
    useNearbyPlaces(
      {
        lat: nearbyAnchor.lat,
        lng: nearbyAnchor.lng,
        radius: nearbyRadius,
      },
      nearbySearchRequested
    )

  const restaurants = nearbySearchRequested ? (nearbyData ?? []) : []

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
    !!committedKeyword
  )

  const places = committedKeyword ? (data?.content ?? []) : []
  const pageInfo = committedKeyword ? data?.pageInfo : undefined

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

  const categories = ['전체', '한식', '일식', '중식', '양식', '카페', '술집']

  const filteredNearby = useMemo(() => {
    if (selectedCategory === '전체') return restaurants
    return restaurants.filter((r) => r.category === selectedCategory)
  }, [restaurants, selectedCategory])

  const nearbyForMap = useMemo(
    () =>
      filteredNearby.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          !(p.lat === 0 && p.lng === 0)
      ),
    [filteredNearby]
  )

  const mapPlaces = useMemo(
    () => mergeByPlaceId(placesForMap, nearbyForMap),
    [placesForMap, nearbyForMap]
  )

  useEffect(() => {
    if (placesForMap.length === 0) return
    const first = placesForMap[0]
    setMapCenter({ lat: first.lat, lng: first.lng })
  }, [committedKeyword, page, placesForMap])

  /** develop: 목록·검색 기준 선택은 places 우선, 주변 전용 핀은 mapPlaces에서 */
  const selectedPlace = useMemo(() => {
    if (selectedPlaceKey == null) return null
    return (
      places.find((p) => getPlaceKey(p) === selectedPlaceKey) ??
      mapPlaces.find((p) => getPlaceKey(p) === selectedPlaceKey) ??
      null
    )
  }, [places, mapPlaces, selectedPlaceKey])

  const currentSelectedPlaceKey = selectedPlace ? getPlaceKey(selectedPlace) : null
  const selectedInternalPlaceId = selectedPlace
    ? getInternalPlaceId(selectedPlace) ?? (currentSelectedPlaceKey ? resolvedPlaceIds[currentSelectedPlaceKey] ?? null : null)
    : null

  const { mutateAsync: syncPlace } = useSyncPlace()

  useEffect(() => {
    let cancelled = false

    if (!selectedPlace || currentSelectedPlaceKey == null) {
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
          [currentSelectedPlaceKey]: response.placeId,
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
  }, [selectedInternalPlaceId, selectedPlace, currentSelectedPlaceKey, syncPlace])

  const { data: selectedPlaceDetail } = usePlaceDetail(
    selectedInternalPlaceId ?? 0,
    selectedInternalPlaceId != null
  )
  const selectedPlaceForDisplay = selectedPlaceDetail ?? selectedPlace

  const handlePlaceClick = (place: Place) => {
    if (reviewPanel) setReviewPanel(null)
    setSelectedPlaceKey(getPlaceKey(place))
  }

  const handleListPlaceClick = (place: Place) => {
    setSelectedPlaceKey(getPlaceKey(place))
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
    const v = mapViewportRef.current
    const newOrigin = { lat: v.lat, lng: v.lng }
    const next = searchInput.trim()

    setSearchOrigin(newOrigin)
    setPage(1)

    if (next && next === committedKeyword) {
      const sameOrigin =
        Math.abs(newOrigin.lat - searchOrigin.lat) < 1e-7 &&
        Math.abs(newOrigin.lng - searchOrigin.lng) < 1e-7
      if (sameOrigin) {
        void refetchSearch()
      }
      return
    }

    setCommittedKeyword(next)
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

  const openReviewFromDetail = async () => {
    if (!selectedPlace) return

    const reviewsEnabled = import.meta.env.VITE_REVIEWS_ENABLED === 'true'
    if (!reviewsEnabled) {
      toast.error('리뷰 기능은 준비 중입니다.')
      return
    }

    if (selectedInternalPlaceId != null) {
      setReviewPanel({
        placeId: selectedInternalPlaceId,
        placeName: selectedPlace.name,
      })
      return
    }

    try {
      const response = await syncPlace(buildPlaceSyncRequest(selectedPlace))
      if (!response) return
      setReviewPanel({
        placeId: response.placeId,
        placeName: selectedPlace.name,
      })
    } catch (err) {
      toast.error(extractApiErrorMessage(err, '장소 동기화에 실패했습니다.'))
    }
  }

  useEffect(() => {
    if (selectedPlaceKey == null) return
    if (!mapPlaces.some((p) => getPlaceKey(p) === selectedPlaceKey)) {
      setSelectedPlaceKey(null)
    }
  }, [mapPlaces, selectedPlaceKey])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* 가게 검색 패널 */}
        <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-primary/10 bg-white shadow-xl dark:border-slate-800 dark:bg-background-dark">
          <div className="flex-shrink-0 border-b border-primary/5 p-6">
            <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span className="text-primary">맛따라 술따라</span>
              <span className="text-sm font-normal text-slate-500">가게 검색</span>
            </h1>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                submitStoreSearch()
              }}
            >
              <div className="relative min-w-0 flex-1">
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
              </div>
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
            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 text-center text-slate-500">검색 중...</div>
              )}
              {error && (
                <div className="p-4 text-center text-red-500">
                  검색 중 오류가 발생했습니다.
                </div>
              )}
              {!isLoading && !error && places.length === 0 && committedKeyword && (
                <div className="p-4 text-center text-slate-500">
                  검색 결과가 없습니다.
                </div>
              )}
              {!isLoading && !error && !committedKeyword && (
                <div className="p-4 text-center text-slate-500">
                  검색어를 입력한 뒤 검색 버튼을 눌러주세요.
                </div>
              )}
              {places.map((place: Place) => {
                const pk = getPlaceKey(place)
                return (
                  <div
                    key={pk}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleListPlaceClick(place)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleListPlaceClick(place)
                    }}
                    className={`group cursor-pointer border-b border-primary/5 p-4 transition-colors hover:bg-primary/5 ${
                      selectedPlaceKey === pk ? 'bg-primary/10' : ''
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
                              <span className="material-symbols-outlined fill-current text-[14px]">
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
                )
              })}
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
                    onClick={() => setPage((p) => Math.min(pageInfo.totalPages, p + 1))}
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

        {/* 주변 맛집 발견 (검색 패널 오른쪽) */}
        <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-background-dark">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 p-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                <span className="material-symbols-outlined text-primary">explore</span>
                주변 맛집 발견
              </h2>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="필터"
              >
                <span className="material-symbols-outlined text-[22px]">tune</span>
              </button>
            </div>

            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  disabled={!nearbySearchRequested}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedCategory === category
                      ? 'scale-105 bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/30">
            {!nearbySearchRequested ? null : isNearbyLoading ? (
              <div className="flex h-40 flex-col items-center justify-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-slate-400">최적의 맛집을 찾는 중...</p>
              </div>
            ) : filteredNearby.length > 0 ? (
              filteredNearby.map((place) => {
                const pk = getPlaceKey(place)
                return (
                  <div
                    key={pk}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleListPlaceClick(place)}
                    className={`group cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-300 dark:bg-slate-900 ${
                      selectedPlaceKey === pk
                        ? 'scale-[1.02] border-primary shadow-xl ring-2 ring-primary/20'
                        : 'border-slate-100 hover:border-slate-300 hover:shadow-lg dark:border-slate-700'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleListPlaceClick(place)
                    }}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3
                          className={`font-black tracking-tight transition-colors ${
                            selectedPlaceKey === pk
                              ? 'text-primary'
                              : 'text-slate-800 group-hover:text-primary dark:text-slate-100'
                          }`}
                        >
                          {place.name}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {place.category || '음식점'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 dark:bg-amber-900/30">
                        <span className="material-symbols-outlined fill-amber-400 text-[16px] text-amber-400">
                          star
                        </span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                          {place.rating ?? 0.0}
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 line-clamp-1">
                      <span className="material-symbols-outlined text-[18px] text-slate-300">
                        location_on
                      </span>
                      {place.address}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 dark:border-slate-800">
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                        영업 중
                      </span>
                      <span
                        className="rounded-full p-1 text-slate-400 transition-all group-hover:bg-primary/5 group-hover:text-primary"
                        aria-hidden
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="material-symbols-outlined text-[32px] text-slate-300">no_meals</span>
                </div>
                <h4 className="mb-1 font-bold text-slate-700 dark:text-slate-200">장소가 없습니다</h4>
                <p className="text-xs leading-relaxed text-slate-400">
                  지도를 이동하거나 다른 카테고리를
                  <br />
                  선택해 보세요.
                </p>
              </div>
            )}
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1">
          <KakaoMap
            className="h-full w-full"
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            places={mapPlaces}
            selectedPlaceId={selectedPlaceKey}
            detailPlace={selectedPlace && !reviewPanel ? (selectedPlaceForDisplay ?? selectedPlace) : null}
            onDetailClose={() => setSelectedPlaceKey(null)}
            onDetailReviewClick={openReviewFromDetail}
            onPlaceClick={handlePlaceClick}
            onIdle={handleMapIdle}
          />

          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
            <button
              type="button"
              disabled={isNearbyLoading}
              onClick={handleRefreshNearby}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-100 bg-white px-6 py-2.5 font-bold text-slate-700 shadow-xl hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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

export default Search
