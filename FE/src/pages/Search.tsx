import { useState } from 'react'
import Sidebar from '../components/Sidebar'

interface Restaurant {
  id: number
  name: string
  rating: number
  isOpen: boolean
  address: string
  description: string
  lat: number
  lng: number
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null)

  // TODO: 실제 검색 API 연동
  const restaurants: Restaurant[] = [
    {
      id: 1,
      name: '만선호프',
      rating: 4.5,
      isOpen: true,
      address: '서울특별시 중구 을지로13길 19',
      description: '을지로 대표 노가리 골목의 성지',
      lat: 37.5665,
      lng: 126.9928,
    },
    {
      id: 2,
      name: '정통집 홍대점',
      rating: 4.3,
      isOpen: true,
      address: '서울특별시 마포구 어울마당로 123',
      description: '맛있는 돼지김치구이와 볶음밥',
      lat: 37.5563,
      lng: 126.9236,
    },
    {
      id: 3,
      name: '시선 이자카야',
      rating: 4.8,
      isOpen: true,
      address: '서울특별시 강남구 테헤란로 222',
      description: '분위기 좋은 레트로 감성 이자카야',
      lat: 37.4979,
      lng: 127.0276,
    },
  ]

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant.id)}
              className={`p-4 border-b border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors group ${
                selectedRestaurant === restaurant.id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0 shadow-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400">
                    restaurant
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                      {restaurant.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-amber-600">
                      <span className="material-symbols-outlined text-[14px] fill-current">
                        star
                      </span>
                      {restaurant.rating}
                    </div>
                  </div>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      restaurant.isOpen ? 'text-primary' : 'text-slate-400'
                    }`}
                  >
                    {restaurant.isOpen ? '영업 중' : '영업 종료'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {restaurant.address}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {restaurant.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
        {filteredRestaurants.map((restaurant, index) => (
          <div
            key={restaurant.id}
            className={`absolute cursor-pointer transition-transform ${
              selectedRestaurant === restaurant.id ? 'scale-110 z-20' : 'z-10'
            }`}
            style={{
              left: `${20 + index * 30}%`,
              top: `${30 + index * 20}%`,
            }}
            onClick={() => setSelectedRestaurant(restaurant.id)}
          >
            <div className="relative group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform ${
                  selectedRestaurant === restaurant.id
                    ? 'bg-primary scale-110'
                    : 'bg-primary group-hover:scale-110'
                }`}
              >
                <span className="material-symbols-outlined text-xl text-white">
                  local_bar
                </span>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 border-r-2 border-b-2 border-white" />
              {selectedRestaurant === restaurant.id && (
                <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 bg-white dark:bg-background-dark px-3 py-1.5 rounded-lg shadow-xl border border-primary/20 whitespace-nowrap">
                  <p className="text-xs font-bold">{restaurant.name}</p>
                  <p className="text-[10px] text-primary">★ {restaurant.rating}</p>
                </div>
              )}
            </div>
          </div>
        ))}

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
