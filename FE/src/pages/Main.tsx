import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWidget from '../components/chat/ChatWidget'

interface RestaurantPin {
  id: string
  name: string
  lat: number
  lng: number
  isOpen: boolean
  address: string
  hours: string
}

const Main = () => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})

  // TODO: 실제 지도 API 연동 (네이버 지도 또는 카카오맵)
  const restaurants: RestaurantPin[] = [
    {
      id: '1',
      name: '만선호프',
      lat: 37.5665,
      lng: 126.9928,
      isOpen: true,
      address: '서울 중구 을지로13길 19',
      hours: '오늘 17:00 - 24:00',
    },
    {
      id: '2',
      name: '시선 이자카야',
      lat: 37.4979,
      lng: 127.0276,
      isOpen: true,
      address: '서울 강남구 테헤란로 222',
      hours: '오늘 18:00 - 02:00',
    },
  ]

  const handleRatingChange = (id: string, value: number) => {
    setRatings((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <ChatWidget />
      <main className="flex-1 relative bg-slate-100 dark:bg-slate-900">
        {/* Map Background - TODO: 실제 지도 API로 교체 */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/mock-map.png')",
            filter: 'brightness(0.98) contrast(1.02)',
          }}
        >
          {/* Map Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/5" />

          {/* Map Pins + Inline Cards */}
          {restaurants.map((place, index) => {
            const currentRating = ratings[place.id] || 0
            const isSelected = selectedPin === place.id

            return (
              <div
                key={place.id}
                className={`absolute cursor-pointer transition-transform ${isSelected ? 'scale-110 z-20' : 'z-10'
                  }`}
                style={{
                  left: `${25 + index * 35}%`,
                  top: `${35 + index * 25}%`,
                }}
              >
                <div className="relative flex flex-col items-center">
                  {/* 카드: 핀 위에 표시 */}
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
                          onClick={() => setSelectedPin(null)}
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

                  {/* 핀 아이콘 (원 + 아래 꼬리) */}
                  <button
                    type="button"
                    onClick={() => setSelectedPin(place.id)}
                    className="relative flex flex-col items-center group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform ${isSelected ? 'bg-primary scale-110' : 'bg-primary group-hover:scale-110'
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
        </div>

        {/* Map Controls */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-20">
          <button className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-2xl">my_location</span>
          </button>
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700">
            <button className="w-14 h-14 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <button className="w-14 h-14 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200">
              <span className="material-symbols-outlined text-xl">remove</span>
            </button>
          </div>
          <button className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-xl">layers</span>
          </button>
        </div>
      </main>
    </div>
  )
}

export default Main
