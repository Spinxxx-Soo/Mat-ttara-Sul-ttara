import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import KakaoMap from '@/components/map/KakaoMap'
import { useNearbyPlaces, useEnrichPlace } from '@/hooks/queries/place/usePlaces'
import { usePlanDetailQuery, useUpdatePlanMutation } from '@/hooks/queries/plan/usePlanQueries'
import { useAuthStore } from '@/stores/authStore'
import { useLocationStore, FALLBACK_LOCATION } from '@/stores/locationStore'
import { hasNullFields } from '@/lib/placeUtils'
import { Place } from '@/types/api'
import toast from 'react-hot-toast'

const MyPlanEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { lat: userLat, lng: userLng } = useLocationStore()
  
  // 지도 관련 상태
  const [mapCenter, setMapCenter] = useState({ lat: userLat || FALLBACK_LOCATION.lat, lng: userLng || FALLBACK_LOCATION.lng })
  const [zoom, setZoom] = useState(15)
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([])

  // 데이터 쿼리 (S14P21B205-129 연동)
  const { data: places = [], isLoading: isPlacesLoading } = useNearbyPlaces(
    { 
      lat: mapCenter.lat, 
      lng: mapCenter.lng, 
      radius: zoom >= 16 ? 500 : zoom >= 14 ? 1500 : 3000 
    },
    true
  )
  const { data: plan, isLoading: isPlanLoading } = usePlanDetailQuery(id || '')
  const { mutate: updatePlan, isPending: isUpdating } = useUpdatePlanMutation()
  const { mutate: enrichPlace } = useEnrichPlace()

  // 폼 상태
  const [title, setTitle] = useState('')
  const [meetingAt, setMeetingAt] = useState('')
  const [participantCount, setParticipantCount] = useState('2')
  const [totalBudget, setTotalBudget] = useState('50000')
  const [planType, setPlanType] = useState('친목/회식')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    if (plan) {
      setTitle(plan.title)
      setMeetingAt(plan.meetingAt.slice(0, 16)) // YYYY-MM-DDThh:mm
      setParticipantCount(plan.participantCount.toString())
      setTotalBudget(plan.totalBudget.toString())
      setPlanType(plan.planType)
      setMemo(plan.memo || '')
      
      if (plan.places && selectedPlaces.length === 0) {
        setSelectedPlaces(plan.places.map(p => ({
          placeId: p.placeId,
          name: p.name,
          address: p.address,
          category: p.category,
          lat: p.lat,
          lng: p.lng
        } as Place)))
        
        if (plan.places.length > 0) {
          setMapCenter({
            lat: plan.places[0].lat,
            lng: plan.places[0].lng
          })
        }
      }
    } else if (user?.name && !title) {
      setTitle(`${user.name}님의 맛집 모임`)
    }
  }, [plan, user?.name])

  const handleIdle = useCallback((newCenter: { lat: number; lng: number }, newZoom: number) => {
    setMapCenter(newCenter)
    setZoom(newZoom)
  }, [])

  const handlePlaceClick = (place: Place) => {
    // Lazy Loading: 정보가 부족하면 크롤링 요청
    if (hasNullFields(place)) {
      enrichPlace(place.placeId)
    }

    setSelectedPlaces(prev => {
      const exists = prev.find(p => p.placeId === place.placeId)
      if (exists) {
        return prev.filter(p => p.placeId !== place.placeId)
      }
      return [...prev, place]
    })
  }

  const removePlace = (placeId: number) => {
    setSelectedPlaces(prev => prev.filter(p => p.placeId !== placeId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!id) return;

    if (selectedPlaces.length === 0) {
      toast.error('최소 하나 이상의 장소를 선택해주세요.')
      return
    }

    // S14P21B205-255: 실제 수정 API 요청 규격 준수 (Payload Assembly)
    updatePlan({
      planId: id,
      data: {
        title,
        meetingAt: meetingAt ? new Date(meetingAt).toISOString() : new Date().toISOString(),
        participantCount: Number(participantCount),
        totalBudget: Number(totalBudget),
        planType,
        memo,
        details: selectedPlaces.map((p, index) => ({
          placeId: p.placeId,
          seqNo: index + 1
        })),
      }
    }, {
      onSuccess: () => {
        toast.success('플랜이 수정되었습니다!')
        navigate(`/my-plan/${id}`)
      },
      onError: (error: any) => {
        // Validation Error 처리 로직 분리 (S14P21B205-258)
        const errors = error.response?.data?.errors;
        if (errors && Object.keys(errors).length > 0) {
          const firstKey = Object.keys(errors)[0];
          toast.error(`${errors[firstKey][0]}`);
        } else {
          toast.error(error.response?.data?.message || '플랜 수정 중 오류가 발생했습니다.')
        }
      }
    })
  }

  if (isPlanLoading) {
    return <div className="flex justify-center items-center h-screen w-full bg-background-light dark:bg-background-dark">로딩 중...</div>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex">
        {/* 왼쪽: 플랜 생성 폼 */}
        <section className="w-[480px] max-w-[520px] h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-primary/10 shadow-xl px-8 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-black tracking-tight mb-1">플랜 정보 수정</h1>
            <p className="text-slate-500 text-sm">
              {user?.name
                ? `${user.name}님, 모임 정보를 수정하고 장소를 편집하세요.`
                : '모임 정보를 수정하고 장소를 편집하세요.'}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                플랜명
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 강남역 불금 미식회"
                className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  약속 일시
                </label>
                <input
                  type="datetime-local"
                  value={meetingAt}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  인원 수
                </label>
                <input
                  type="number"
                  min={1}
                  value={participantCount}
                  onChange={(e) => setParticipantCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  예상 예산 (원)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                모임 유형
              </label>
              <div className="flex gap-2">
                {['친목/회식', '데이트', '비즈니스'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPlanType(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                      planType === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                선택한 장소 ({selectedPlaces.length})
              </label>
              <div className="space-y-2">
                {selectedPlaces.length > 0 ? (
                  selectedPlaces.map((place, idx) => (
                    <div key={place.placeId} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/10 bg-background-light dark:bg-slate-800 group animate-in slide-in-from-left-2 duration-200">
                      <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {place.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {place.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlace(place.placeId)}
                        className="p-1 hover:text-red-500 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 rounded-xl border border-dashed border-primary/30 bg-background-light dark:bg-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      오른쪽 지도에서 방문할 장소들을 클릭하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                메모 (선택)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                placeholder="약속 분위기나 참고할 내용을 적어주세요."
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => navigate('/my-plan')}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          </form>
        </section>

        {/* 오른쪽: 지도 영역 */}
        <section className="flex-1 relative">
           <KakaoMap 
            places={places}
            selectedPlaceId={selectedPlaces[selectedPlaces.length - 1]?.placeId}
            onPlaceClick={handlePlaceClick}
            onIdle={handleIdle}
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            className="w-full h-full"
           />
           {isPlacesLoading && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full shadow-lg text-xs font-bold text-primary flex items-center gap-2">
                <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                장소 탐색 중...
             </div>
           )}
        </section>
      </main>
    </div>
  )
}

export default MyPlanEdit;
