import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'

import ErrorState from '@/components/ui/ErrorState'
import LoadingState from '@/components/ui/LoadingState'
import {
  useDeletePlanMutation,
  usePlanDetailQuery,
} from '@/hooks/queries/plan/usePlanQueries'
import { usePendingDelay } from '@/hooks/usePendingDelay'
import {
  PLAN_MESSAGES,
  getPlanMutationErrorMessage,
  getPlanPageErrorState,
} from '@/lib/planUi'

import Sidebar from '../components/Sidebar'

const MyPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showShareModal, setShowShareModal] = useState(false)

  const { data: plan, isLoading, isError, error } = usePlanDetailQuery(id || '')
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePlanMutation()
  const showDeleteDelay = usePendingDelay(isDeleting)

  // shareUrl은 plan이 존재할 때만 사용
  const shareUrl = plan ? `${window.location.origin}/my-plan/${plan.id}` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success(PLAN_MESSAGES.copySuccess)
  }

  const handleDelete = () => {
    if (confirm('정말 이 플랜을 삭제하시겠습니까?')) {
      if (!id) return;
      deletePlan(id, {
        onSuccess: () => {
          toast.success(PLAN_MESSAGES.deleteSuccess);
          navigate('/my-plan');
        },
        onError: (error: unknown) => {
          toast.error(getPlanMutationErrorMessage(error, 'delete'));
        }
      });
    }
  }

  const errorState = getPlanPageErrorState(error, 'detail')

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
          {plan && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                공유
              </button>
              <button
                onClick={() => navigate(`/my-plan/${id}/edit`)}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-primary/10 shadow-sm"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800 shadow-sm"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showDeleteDelay && (
            <div className="px-8 pt-4">
              <p className="text-right text-xs text-slate-500">
                {PLAN_MESSAGES.delayedPending}
              </p>
            </div>
          )}
          {isLoading ? (
            <LoadingState className="h-[60vh]" />
          ) : isError || !plan ? (
            <ErrorState
              className="h-[60vh]"
              title={errorState.title}
              message={errorState.message}
              actionText={errorState.actionText}
              onRetry={() => navigate('/my-plan')}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-8 w-full space-y-6">
              {/* Plan Info Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {plan.title}
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 약속 일시 - meetingAt 기반 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        calendar_today
                      </span>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">약속 일시</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {plan.formattedDate}
                        </p>
                      </div>
                    </div>

                    {/* 인원 수 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">group</span>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">인원 수</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {plan.participantCount}명
                        </p>
                      </div>
                    </div>

                    {/* 예산 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        payments
                      </span>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">예산</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {plan.formattedBudget}원
                        </p>
                      </div>
                    </div>

                    {/* 유형 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        location_on
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">유형</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {plan.planType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 메모 */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">메모</p>
                    <p className="text-base text-slate-700 dark:text-slate-300">
                      {plan.memo || PLAN_MESSAGES.emptyMemo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Places List (S14P21B205-213) */}
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
                        className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-colors"
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

      {/* Share Modal */}
      {showShareModal && plan && (
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
              {PLAN_MESSAGES.shareDescription}
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none"
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
                window.open(
                  `https://talk.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
                  '_blank'
                )
              }}
              className="w-full px-4 py-3 bg-[#FEE500] text-slate-900 rounded-lg font-semibold hover:bg-[#FEE500]/90 transition-colors"
            >
              {PLAN_MESSAGES.shareKakao}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyPlanDetail
