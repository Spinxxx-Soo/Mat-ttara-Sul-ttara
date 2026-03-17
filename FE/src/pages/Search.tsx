import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useSearchPlaces } from '@/hooks/queries/place/usePlaces'
import type { Place } from '@/types/api'

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // 검색어가 변경되면 페이지를 1로 리셋
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  // React Query 훅 사용
  const { data, isLoading, error } = useSearchPlaces({
    keyword: searchQuery || '', // 필수 파라미터 (빈 문자열이라도 전달)
    page,
    size: pageSize,
  }, !!searchQuery) // 검색어가 있을 때만 활성화

  const places = data?.content || []
  const pageInfo = data?.pageInfo

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      {/* Search Widget */}
      <div className="w-[400px] flex flex-col bg-white dark:bg-background-dark border-r border-primary/10 z-40 shadow-xl">
        {/* Search Header */}
        <div className="p-6 border-b border-primary/5">
          <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
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
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
              placeholder="가게 이름, 메뉴 또는 지역 검색"
            />
          </div>
          {/* 필터 버튼 (MVP 제외) */}
          {/*
          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar">
            <button className="shrink-0 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium">
              전체
            </button>
            <button className="shrink-0 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              영업 중
            </button>
            <button className="shrink-0 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              별점 높은 순
            </button>
            <button className="shrink-0 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              주차 가능
            </button>
          </div>
          */}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {isLoading && (
            <div className="p-4 text-center text-slate-500">
              검색 중...
            </div>
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
              onClick={() => setSelectedPlace(place.placeId)}
              className={`p-4 border-b border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors group ${
                selectedPlace === place.placeId ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0 shadow-sm flex items-center justify-center overflow-hidden">
                  {place.imageUrl ? (
                    <img 
                      src={place.imageUrl} 
                      alt={place.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400">
                      restaurant
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                      {place.name}
                    </h3>
                    {place.rating && (
                      <div className="flex items-center gap-1 text-xs font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-amber-600">
                        <span className="material-symbols-outlined text-[14px] fill-current">
                          star
                        </span>
                        {place.rating}
                      </div>
                    )}
                  </div>
                  {place.category && (
                    <p className="text-xs font-medium mt-1 text-primary">
                      {place.category}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {place.address}
                  </p>
                  {place.phone && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {place.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* 페이지네이션 */}
          {pageInfo && pageInfo.totalPages > 1 && (
            <div className="p-4 border-t border-primary/5 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-primary/10 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                {page} / {pageInfo.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pageInfo.totalPages, p + 1))}
                disabled={!pageInfo.hasNext}
                className="px-3 py-1 rounded bg-primary/10 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <main className="flex-1 relative bg-slate-200">
        {/* TODO: 실제 지도 API 연동 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/mock-map.png')",
          }}
        >
          <div className="absolute inset-0 bg-slate-400/10 pointer-events-none" />
        </div>

        {/* Map Pins */}
        {places.map((place: Place, index: number) => {
          // 임시 그리드 레이아웃 (3열): 지도 API 연동 전까지 화면 안에 머물도록
          const cols = 3
          const colIndex = index % cols
          const rowIndex = Math.floor(index / cols)
          const left = 10 + colIndex * 30 // 10%, 40%, 70%
          const top = 20 + rowIndex * 15 // 20%, 35%, 50%, ...
          
          return (
          <div
            key={place.placeId}
            className={`absolute cursor-pointer transition-transform ${
              selectedPlace === place.placeId ? 'scale-110 z-20' : 'z-10'
            }`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
            }}
            onClick={() => setSelectedPlace(place.placeId)}
          >
            <div className="relative group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform ${
                  selectedPlace === place.placeId
                    ? 'bg-primary scale-110'
                    : 'bg-primary group-hover:scale-110'
                }`}
              >
                <span className="material-symbols-outlined text-xl text-white">
                  local_bar
                </span>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 border-r-2 border-b-2 border-white" />
              {selectedPlace === place.placeId && (
                <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 bg-white dark:bg-background-dark px-3 py-1.5 rounded-lg shadow-xl border border-primary/20 whitespace-nowrap">
                  <p className="text-xs font-bold">{place.name}</p>
                  {place.rating && (
                    <p className="text-[10px] text-primary">★ {place.rating}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          )
        })}

        {/* Map Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white dark:bg-background-dark rounded-lg shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <div className="flex flex-col bg-white dark:bg-background-dark rounded-lg shadow-lg">
            <button className="w-10 h-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Search
