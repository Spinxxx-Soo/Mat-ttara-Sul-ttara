import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NaverMap from '@/components/map/NaverMap'
import { useNearbyPlaces } from '@/hooks/queries/place/usePlaces'
import { useCreatePlanMutation } from '@/hooks/queries/plan/usePlanQueries'
import { useLocationStore, FALLBACK_LOCATION } from '@/stores/locationStore'
import { Place } from '@/types/api'
import toast from 'react-hot-toast'

const MyPlanCreate = () => {
  const navigate = useNavigate()
  const { lat: userLat, lng: userLng } = useLocationStore()
  
  // 지도 관련 상태
  const [mapCenter, setMapCenter] = useState({ lat: userLat || FALLBACK_LOCATION.lat, lng: userLng || FALLBACK_LOCATION.lng })
  const [zoom, setZoom] = useState(15)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)

  // 데이터 쿼리 (S14P21B205-129 연동)
  const { data: places = [], isLoading: isPlacesLoading } = useNearbyPlaces(
    { 
      lat: mapCenter.lat, 
      lng: mapCenter.lng, 
      radius: zoom >= 16 ? 500 : zoom >= 14 ? 1500 : 3000 
    },
    true
  )
  const { mutate: createPlan, isPending: isCreating } = useCreatePlanMutation()

  // 폼 상태
  const [title, setTitle] = useState('')
  const [meetingAt, setMeetingAt] = useState('')
  const [participantCount, setParticipantCount] = useState('2')
  const [totalBudget, setTotalBudget] = useState('50000')
  const [planType, setPlanType] = useState('친목/회식')
  const [memo, setMemo] = useState('')

  const handleIdle = useCallback((newCenter: { lat: number; lng: number }, newZoom: number) => {
    setMapCenter(newCenter)
    setZoom(newZoom)
  }, [])

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlace) {
      toast.error('장소를 선택해주세요.')
      return
    }

    // S14P21B205-132: 실제 생성 API 요청 규격 준수
    createPlan({
      title,
      meetingAt: meetingAt ? new Date(meetingAt).toISOString() : new Date().toISOString(),
      participantCount: Number(participantCount),
      totalBudget: Number(totalBudget),
      planType,
      memo,
      details: [
        { placeId: selectedPlace.placeId, seqNo: 1 }
      ],
    }, {
      onSuccess: () => {
        toast.success('플랜이 생성되었습니다!')
        navigate('/my-plan')
      },
      onError: () => {
        toast.error('플랜 생성 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex">
        {/* 왼쪽: 플랜 생성 폼 */}
        <section className="w-[480px] max-w-[520px] h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-primary/10 shadow-xl px-8 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-black tracking-tight mb-1">플랜 새로 만들기</h1>
            <p className="text-slate-500 text-sm">
              모임 정보를 입력하고, 오른쪽 지도에서 장소를 선택하세요.
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
                선택한 장소
              </label>
              <div className="px-4 py-3 rounded-lg border border-dashed border-primary/30 bg-background-light dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
                {selectedPlace ? (
                  <>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedPlace.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedPlace.address}
                    </p>
                    <p className="text-xs font-bold text-primary mt-1">
                      {selectedPlace.category}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    오른쪽 지도에서 장소를 클릭해 선택하세요.
                  </p>
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
                disabled={isCreating}
                className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '생성 중...' : '플랜 생성하기'}
              </button>
            </div>
          </form>
        </section>

        {/* 오른쪽: 지도 영역 */}
        <section className="flex-1 relative">
           <NaverMap 
            places={places}
            selectedPlaceId={selectedPlace?.placeId}
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

export default MyPlanCreate;
