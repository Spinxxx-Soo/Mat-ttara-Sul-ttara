import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const MyPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showShareModal, setShowShareModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // TODO: 실제 플랜 데이터 API 연동
  const plan = {
    id: id || '1',
    name: '강남역 불금 미식회',
    date: '2024-01-15',
    time: '19:00',
    people: 4,
    budget: 200000,
    location: '서울 강남구 역삼동 인근',
    reason: '강남역 근처 다양한 맛집과 분위기 좋은 술집이 많아서 추천합니다.',
    restaurants: [
      { name: '맛있는 식당', type: '한식', rating: 4.5 },
      { name: '분위기 좋은 바', type: '바', rating: 4.8 },
    ],
  }

  const shareUrl = `${window.location.origin}/my-plan/${plan.id}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('링크가 복사되었습니다!')
  }

  const handleDelete = () => {
    if (confirm('정말 이 플랜을 삭제하시겠습니까?')) {
      // TODO: 삭제 API 호출
      navigate('/my-plan')
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-6 flex justify-between items-center border-b border-primary/5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/my-plan')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back</span>
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tight">플랜 상세</h2>
              <p className="text-slate-500 text-sm mt-1">
                플랜 정보를 확인하고 수정하세요.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              공유
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-primary/10 shadow-sm"
            >
              {isEditing ? '저장' : '수정'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800 shadow-sm"
            >
              삭제
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-8 w-full space-y-6">
          {/* Plan Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="space-y-6">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={plan.name}
                    className="text-3xl font-bold text-slate-900 dark:text-slate-100 w-full px-4 py-2 border border-primary/20 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h1>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    calendar_today
                  </span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">약속 일시</p>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          defaultValue={plan.date}
                          className="text-base font-semibold text-slate-900 dark:text-slate-100 px-2 py-1 border border-primary/20 rounded"
                        />
                        <input
                          type="time"
                          defaultValue={plan.time}
                          className="text-base font-semibold text-slate-900 dark:text-slate-100 px-2 py-1 border border-primary/20 rounded"
                        />
                      </div>
                    ) : (
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {plan.date} {plan.time}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">group</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">인원 수</p>
                    {isEditing ? (
                      <input
                        type="number"
                        defaultValue={plan.people}
                        className="text-base font-semibold text-slate-900 dark:text-slate-100 w-20 px-2 py-1 border border-primary/20 rounded"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {plan.people}명
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    payments
                  </span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">예산</p>
                    {isEditing ? (
                      <input
                        type="number"
                        defaultValue={plan.budget}
                        className="text-base font-semibold text-slate-900 dark:text-slate-100 w-32 px-2 py-1 border border-primary/20 rounded"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {plan.budget.toLocaleString()}원
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    location_on
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">장소</p>
                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={plan.location}
                        className="text-base font-semibold text-slate-900 dark:text-slate-100 w-full px-2 py-1 border border-primary/20 rounded"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {plan.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">추천 이유</p>
                {isEditing ? (
                  <textarea
                    defaultValue={plan.reason}
                    className="w-full px-4 py-3 border border-primary/20 rounded-lg focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                ) : (
                  <p className="text-base text-slate-700 dark:text-slate-300">{plan.reason}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">플랜 공유</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              아래 링크를 복사하여 카카오톡으로 공유하세요.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                복사
              </button>
            </div>
            <button
              onClick={() => {
                // TODO: 카카오톡 공유 API 연동
                window.open(
                  `https://talk.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
                  '_blank'
                )
              }}
              className="w-full px-4 py-3 bg-[#FEE500] text-slate-900 rounded-lg font-semibold hover:bg-[#FEE500]/90 transition-colors"
            >
              카카오톡으로 공유하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyPlanDetail
