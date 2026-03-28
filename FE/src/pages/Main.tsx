// FE/src/pages/Main.tsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/chat/ChatWidget'
import PlaceReviewPanel from '@/components/reviews/PlaceReviewPanel'
import KakaoMap from '@/components/map/KakaoMap'
import { useEnrichPlace, useNearbyPlaces, usePlaceDetail, useSyncPlace } from '@/hooks/queries/place/usePlaces'
import { useLocationStore } from '@/stores/locationStore'
import toast from 'react-hot-toast'
import type { Place } from '@/types/api'
import { mergeByPlaceId, useChatMapStore } from '@/stores/chatMapStore'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { useChatMessages, useSetMapLocation } from '@/hooks/queries/chat/useChat'
import type { Coordinates } from '@/types/map'
import { buildPlaceSyncRequest, getInternalPlaceId, getPlaceKey, isSamePlace } from '@/lib/placeIdentity'
import { usePlanCreateDraftStore } from '@/stores/planCreateDraftStore'
import { hasNullFields } from '@/lib/placeUtils'
import { extractApiErrorMessage } from '@/lib/apiUtils'

const Main = () => {
  const navigate = useNavigate()
  const setPlanDraftPlace = usePlanCreateDraftStore((s) => s.setDraftPlace)
  const [planCreateModalPlace, setPlanCreateModalPlace] = useState<Place | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
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

  const { data: restaurants = [] } = useNearbyPlaces(
    {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      radius: zoom > 14 ? 1000 : 2000,
    },
    true
  )

  const { mutate: enrichPlace } = useEnrichPlace()
  const { mutateAsync: syncPlace } = useSyncPlace()

  const activeSessionId = useChatSessionStore((s) => s.activeSessionId)
  const userMessagedSessionIds = useChatSessionStore((s) => s.userMessagedSessionIds)
  const { mutate: setMapLocation, isPending: isMapLocationPending } = useSetMapLocation()

  /** ChatWidget과 동일 파라미터 → React Query 캐시 공유 */
  const { data: sessionMessagesData } = useChatMessages({
    sessionId: activeSessionId,
    page: 1,
    size: 50,
  })
  const hasUserMessageInChat = useMemo(() => {
    const fromServer = (sessionMessagesData?.content ?? []).some(
      (m) => String(m.role).toUpperCase() === 'USER'
    )
    const fromClient =
      !!activeSessionId && userMessagedSessionIds[activeSessionId] === true
    return fromServer || fromClient
  }, [sessionMessagesData, activeSessionId, userMessagedSessionIds])

  const aiRecommendedPlaces = useChatMapStore((s) => s.aiRecommendedPlaces)
  const mapPlaces = useMemo(() => {
    return mergeByPlaceId(restaurants, aiRecommendedPlaces)
  }, [restaurants, aiRecommendedPlaces])

  const isAiRecommendedPlace = useCallback(
    (place: Place) =>
      aiRecommendedPlaces.length > 0 &&
      aiRecommendedPlaces.some((p) => isSamePlace(p, place)),
    [aiRecommendedPlaces]
  )

  const selectedPlace = useMemo(() => {
    if (selectedPlaceId == null) return null
    return mapPlaces.find((p) => p.placeId === selectedPlaceId) ?? null
  }, [mapPlaces, selectedPlaceId])

  const selectedPlaceKey = selectedPlace ? getPlaceKey(selectedPlace) : null
  const selectedInternalPlaceId = selectedPlace
    ? getInternalPlaceId(selectedPlace) ?? (selectedPlaceKey ? resolvedPlaceIds[selectedPlaceKey] ?? null : null)
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
    selectedInternalPlaceId != null
  )
  const selectedPlaceForDisplay = selectedPlaceDetail ?? selectedPlace

  // internal id가 확보된 뒤, 필수 필드가 비어 있으면 backend enrich를 시도한다.
  useEffect(() => {
    if (selectedInternalPlaceId == null) return
    if (!selectedPlaceForDisplay) return
    if (!hasNullFields(selectedPlaceForDisplay)) return

    enrichPlace(selectedInternalPlaceId)
  }, [selectedInternalPlaceId, selectedPlaceForDisplay, enrichPlace])

  const sendSelectedLocationToChat = (coord: Coordinates) => {
    if (!activeSessionId) {
      toast.error('채팅 세션이 준비될 때까지 잠시만 기다려 주세요.')
      return
    }
    // 사용자가 채팅으로 한 번이라도 말을 건 뒤에만 AI(세션)에 지도 위치를 넘긴다.
    if (!hasUserMessageInChat) return
    if (isMapLocationPending) return

    setMapLocation(
      {
        sessionId: activeSessionId,
        lat: coord.lat,
        lng: coord.lng,
      },
      {
        onSuccess: () => {
          toast.success('선택한 위치로 주변 맛집을 찾습니다.')
        },
        onError: (err) => {
          toast.error(extractApiErrorMessage(err, '위치 전송에 실패했습니다.'))
        },
      }
    )
  }

  const handlePlaceClick = (place: Place) => {
    // 리뷰 패널(왼쪽)이 열린 상태에서 다른 핀을 선택하면,
    // 자동으로 리뷰 패널을 닫아(돌아가기) 지도 상세 카드가 보이도록 한다.
    if (reviewPanel) setReviewPanel(null)
    setSelectedPlaceId(place.placeId)
    if (isAiRecommendedPlace(place)) {
      setPlanCreateModalPlace(place)
    } else {
      setPlanCreateModalPlace(null)
    }
    sendSelectedLocationToChat({ lat: place.lat, lng: place.lng })
  }

  const handlePlanCreateModalConfirm = () => {
    if (!planCreateModalPlace) return
    setPlanDraftPlace(planCreateModalPlace)
    setPlanCreateModalPlace(null)
    navigate('/my-plan/new')
  }

  useEffect(() => {
    if (!planCreateModalPlace) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlanCreateModalPlace(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [planCreateModalPlace])

  const handleMapIdle = (
    center: { lat: number; lng: number },
    currentZoom: number
  ) => {
    setMapCenter(center)
    setZoom(currentZoom)
  }

  const handleMapClick = (coord: Coordinates) => {
    sendSelectedLocationToChat(coord)
  }

  const openReviewFromDetail = async () => {
    if (!selectedPlace) return

    const reviewsEnabled = import.meta.env.VITE_REVIEWS_ENABLED === 'true'
    if (!reviewsEnabled) {
      toast.error('리뷰 기능은 준비 중입니다.')
      return
    }

    if (selectedInternalPlaceId == null) {
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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar />

      {/* 왼쪽: ChatWidget 또는 ReviewPanel */}
      <aside className="z-40 flex h-full min-h-0 w-[400px] shrink-0 flex-col border-r border-primary/10 bg-white shadow-xl dark:border-slate-800 dark:bg-background-dark">
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
        {planCreateModalPlace && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-plan-create-title"
            className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPlanCreateModalPlace(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="ai-plan-create-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                플랜 생성
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                이 가게로 약속 플랜을 생성하시겠습니까?
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-primary">
                {planCreateModalPlace.name}
              </p>
              {planCreateModalPlace.address ? (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{planCreateModalPlace.address}</p>
              ) : null}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlanCreateModalPlace(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePlanCreateModalConfirm}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary/90"
                >
                  플랜 생성하기
                </button>
              </div>
            </div>
          </div>
        )}

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
          onClick={handleMapClick}
        />
      </main>
    </div>
  )
}

export default Main
