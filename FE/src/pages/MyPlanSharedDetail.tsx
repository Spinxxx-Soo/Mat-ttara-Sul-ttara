import { useNavigate, useParams } from 'react-router-dom'

import ErrorState from '@/components/ui/ErrorState'
import LoadingState from '@/components/ui/LoadingState'
import { useSharedPlanDetailQuery } from '@/hooks/queries/plan/usePlanQueries'
import { getPlanPageErrorState } from '@/lib/planUi'

const MyPlanSharedDetail = () => {
  const { shareToken } = useParams()
  const navigate = useNavigate()

  const {
    data: plan,
    isLoading,
    isError,
    error,
  } = useSharedPlanDetailQuery(shareToken || '')

  const errorState = getPlanPageErrorState(error, 'detail')

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark px-4 py-6">
      <main className="max-w-4xl mx-auto w-full">
        <header className="mb-6 rounded-2xl bg-white dark:bg-slate-900 px-6 py-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">공유 플랜 보기</h2>
              <p className="text-slate-500 text-sm mt-1">토큰 기반으로 공유된 플랜 정보를 확인합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {plan && (
                <>
                  <button
                    onClick={() => navigate(`/my-plan/${plan.planId}`)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-primary/10"
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => navigate(`/my-plan/${plan.planId}/edit`)}
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    수정하기
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-primary/10"
              >
                뒤로가기
              </button>
            </div>
          </div>
        </header>

        <div className="w-full">
          {isLoading ? (
            <LoadingState className="h-[60vh]" />
          ) : isError || !plan ? (
            <ErrorState
              className="h-[60vh]"
              title={errorState.title}
              message={errorState.message}
              actionText={errorState.actionText}
              onRetry={() => navigate('/')}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 break-all">
                  {plan.title}
                </h1>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                  공유 보기
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">약속 일시</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {plan.formattedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">group</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">인원 수</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {plan.participantCount}명
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">예산</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {plan.formattedBudget}원
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">유형</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {plan.planType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">메모</p>
                <p className="text-base text-slate-700 dark:text-slate-300">
                  {plan.memo || '메모가 없습니다.'}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">route</span>
                  방문 장소 ({plan.places?.length || 0})
                </h3>

                <div className="space-y-3">
                  {plan.places && plan.places.length > 0 ? (
                    plan.places.map((place, index) => (
                      <div
                        key={`${place.placeId}-${index}`}
                        className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {place.seqNo}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">{place.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{place.address}</p>
                        </div>
                        {place.category && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] rounded uppercase font-medium">
                            {place.category}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-slate-500 text-sm">등록된 장소가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MyPlanSharedDetail
