import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

interface Plan {
  id: string
  name: string
  date: string
  people: number
  budget: number
  location: string
  image: string
  status: 'upcoming' | 'completed'
  daysUntil?: number
}

const MyPlan = () => {
  const navigate = useNavigate()

  // TODO: 실제 플랜 데이터 API 연동
  const plans: Plan[] = [
    {
      id: '1',
      name: '강남역 불금 미식회',
      date: '2024-01-15',
      people: 4,
      budget: 200000,
      location: '서울 강남구 역삼동 인근',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      status: 'upcoming',
      daysUntil: 3,
    },
    {
      id: '2',
      name: '을지로 노포 투어',
      date: '2024-01-05',
      people: 2,
      budget: 80000,
      location: '서울 중구 을지로 3가',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
      status: 'completed',
    },
    {
      id: '3',
      name: '청담동 기념일 디너',
      date: '2024-01-25',
      people: 2,
      budget: 350000,
      location: '서울 강남구 청담동',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
      status: 'upcoming',
      daysUntil: 12,
    },
  ]

  const handleCreatePlan = () => {
    // TODO: 플랜 생성 페이지로 이동
    navigate('/my-plan/new')
  }

  const handleViewDetail = (id: string) => {
    navigate(`/my-plan/${id}`)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-6 flex justify-between items-center border-b border-primary/5">
          <div>
            <h2 className="text-2xl font-black tracking-tight">마이플랜</h2>
            <p className="text-slate-500 text-sm mt-1">
              나만의 맛있는 여행 계획을 확인하고 관리하세요.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                search
              </span>
            </button>
            <button className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                notifications
              </span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-8 w-full">
          {/* Title & Add Button */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                내 플랜 리스트
              </h3>
            </div>
            <button
              onClick={handleCreatePlan}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              플랜 새로 만들기
            </button>
          </div>

          {/* Plans List */}
          <div className="grid gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all border border-slate-100 dark:border-slate-800"
              >
                <div className="w-full md:w-72 h-48 md:h-auto overflow-hidden relative">
                  <img
                    alt={plan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={plan.image}
                  />
                  {plan.status === 'upcoming' && plan.daysUntil !== undefined && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-primary/90 text-white text-xs font-bold rounded-full">
                      D-{plan.daysUntil}
                    </div>
                  )}
                  {plan.status === 'completed' && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-slate-500/90 text-white text-xs font-bold rounded-full">
                      종료
                    </div>
                  )}
                </div>
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                        {plan.name}
                      </h4>
                      <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-primary">
                        bookmark
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-primary text-lg">
                          group
                        </span>
                        <span>인원: {plan.people}명</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-primary text-lg">
                          payments
                        </span>
                        <span>예산: {plan.budget.toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 col-span-2">
                        <span className="material-symbols-outlined text-primary text-lg">
                          location_on
                        </span>
                        <span>{plan.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end">
                    <button
                      onClick={() => handleViewDetail(plan.id)}
                      className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold rounded-lg hover:bg-primary hover:text-white transition-all"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-12 flex justify-center">
            <button className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors">
              더 많은 플랜 보기
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MyPlan
