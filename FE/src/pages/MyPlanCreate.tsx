import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

interface Place {
  id: number
  name: string
  lat: number
  lng: number
  address: string
  hours: string
}

const MyPlanCreate = () => {
  const navigate = useNavigate()

  // 임시 추천 장소 (나중에 백엔드/지도 API 연동)
  const places: Place[] = [
    {
      id: 1,
      name: '정통집 강남역점',
      lat: 37.498,
      lng: 127.0276,
      address: '서울 강남구 강남대로 102길 12',
      hours: '오늘 17:00 - 01:00',
    },
    {
      id: 2,
      name: '을지로 골뱅이포차',
      lat: 37.5665,
      lng: 126.9928,
      address: '서울 중구 을지로13길 32',
      hours: '오늘 18:00 - 02:00',
    },
  ]

  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [planName, setPlanName] = useState('') // 플랜명
  const [date, setDate] = useState('') // 약속 날짜
  const [time, setTime] = useState('') // 약속 시간
  const [people, setPeople] = useState('') // 인원 수 (문자열로 관리 후 제출 시 숫자로 변환)
  const [budget, setBudget] = useState('') // 1인당 예산 (문자열로 관리)
  const [type, setType] = useState<'' | 'date' | 'hangout' | 'business'>('') // 모임 유형
  const [memo, setMemo] = useState('') // 메모
  const [ratings, setRatings] = useState<Map<number, number>>(new Map())

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || null

  const handleRatingChange = (id: number, value: number) => {
    setRatings((prev) => {
      const next = new Map(prev)
      next.set(id, value)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

     // 숫자 변환
    const peopleNumber = Number(people)
    const budgetNumber = Number(budget)

    // TODO: 실제 플랜 생성 API 연동
    console.log('새 플랜 생성', {
      planName,
      date,
      time,
      people: peopleNumber,
      budget: budgetNumber,
      type,
      place: selectedPlace,
      memo,
    })

    // 임시: 생성 후 목록으로 이동
    navigate('/my-plan')
  }

  const handlePlaceClick = (placeId: number) => {
    setSelectedPlaceId(placeId)
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
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="예: 강남역 불금 미식회"
                className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  날짜
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  시간
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  1인당 예산 (원)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
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
                <button
                  type="button"
                  onClick={() => setType('hangout')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    type === 'hangout'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  친목/회식
                </button>
                <button
                  type="button"
                  onClick={() => setType('date')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    type === 'date'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  데이트
                </button>
                <button
                  type="button"
                  onClick={() => setType('business')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    type === 'business'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  비즈니스
                </button>
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedPlace.hours}
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
                className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all"
              >
                플랜 생성하기
              </button>
            </div>
          </form>
        </section>

        {/* 오른쪽: 지도 영역 */}
        <section className="flex-1 relative bg-slate-200">
          {/* TODO: 실제 지도 API 연동 */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/mock-map.png')",
            }}
          >
            <div className="absolute inset-0 bg-slate-400/10 pointer-events-none" />
          </div>

          {/* 핀 + 카드 */}
          {places.map((place, index) => {
            const currentRating = ratings.get(place.id) || 0
            const isSelected = selectedPlaceId === place.id

            return (
              <div
                key={place.id}
                className={`absolute cursor-pointer transition-transform ${
                  isSelected ? 'scale-110 z-20' : 'z-10'
                }`}
                style={{
                  left: `${30 + index * 30}%`,
                  top: `${40 + index * 20}%`,
                }}
              >
                <div className="relative flex flex-col items-center">
                  {/* 선택된 식당 카드: 핀 위에 표시 */}
                  {isSelected && (
                    <div className="mb-3 min-w-[260px] max-w-xs rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {place.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {place.hours}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPlaceId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                        {place.address}
                      </p>

                      {/* 별점 선택 */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(place.id, star)}
                            className="p-0.5"
                          >
                            <span
                              className="material-symbols-outlined text-sm"
                              style={{
                                fontVariationSettings:
                                  star <= currentRating ? "'FILL' 1" : "'FILL' 0",
                                color: star <= currentRating ? '#f59e0b' : '#e5e7eb',
                              }}
                            >
                              star
                            </span>
                          </button>
                        ))}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                          {currentRating > 0 ? `${currentRating}.0 / 5` : '별점을 선택해 주세요'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 핀 아이콘 */}
                  <button
                    type="button"
                    onClick={() => handlePlaceClick(place.id)}
                    className="relative flex flex-col items-center group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform ${
                        isSelected ? 'bg-primary scale-110' : 'bg-primary group-hover:scale-110'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl text-white">
                        restaurant
                      </span>
                    </div>
                    {/* 꼬리: 검색 화면과 동일한 스타일 */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 border-r-2 border-b-2 border-white" />
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default MyPlanCreate
