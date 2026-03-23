import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import LoadingState from '@/components/ui/LoadingState'
import ErrorState from '@/components/ui/ErrorState'
import { usePlanDetailQuery, useDeletePlanMutation, useUpdatePlanMutation } from '@/hooks/queries/plan/usePlanQueries'
import toast from 'react-hot-toast'

const MyPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showShareModal, setShowShareModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { data: plan, isLoading, isError } = usePlanDetailQuery(id || '')
  const { mutate: deletePlan } = useDeletePlanMutation()
  const { mutate: updatePlan, isPending: isUpdating } = useUpdatePlanMutation()

  // 수정용 로컬 상태
  const [editForm, setEditForm] = useState({
    title: '',
    participantCount: 0,
    totalBudget: 0,
    planType: '',
    memo: ''
  })

  // 수정 모드 진입 시 초기값 설정
  const toggleEdit = () => {
    if (!isEditing && plan) {
      setEditForm({
        title: plan.title,
        participantCount: plan.participantCount,
        totalBudget: plan.totalBudget,
        planType: plan.planType,
        memo: plan.memo || ''
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSave = () => {
    if (!id || !plan) return

    updatePlan({
      planId: id,
      data: {
        ...editForm,
        // 필요 시 장소 순서 변경 등도 여기서 처리 가능 (현재는 기본 정보 위주)
      }
    }, {
      onSuccess: () => {
        toast.success('플랜이 수정되었습니다.')
        setIsEditing(false)
      },
      onError: () => {
        toast.error('플랜 수정 중 오류가 발생했습니다.')
      }
    })
  }

  // shareUrl은 plan이 존재할 때만 사용
  const shareUrl = plan ? `${window.location.origin}/my-plan/${plan.id}` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success('링크가 복사되었습니다!')
  }

  const handleDelete = () => {
    if (confirm('정말 이 플랜을 삭제하시겠습니까?')) {
      if (!id) return;
      deletePlan(id, {
        onSuccess: () => {
          toast.success('플랜이 삭제되었습니다.');
          navigate('/my-plan');
        },
        onError: () => {
          toast.error('플랜 삭제 중 오류가 발생했습니다.');
        }
      });
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
          {plan && (
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50"
                  >
                    {isUpdating ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                  >
                    공유
                  </button>
                  <button
                    onClick={toggleEdit}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-primary/10 shadow-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800 shadow-sm"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingState className="h-[60vh]" />
          ) : isError || !plan ? (
            <ErrorState
              className="h-[60vh]"
              title="플랜을 불러오지 못했습니다."
              message="유효하지 않은 플랜이거나 서버 오류가 발생했습니다."
              actionText="목록으로 돌아가기"
              onRetry={() => navigate('/my-plan')}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-8 w-full space-y-6">
              {isEditing && (
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  {/* TODO: 수정 API 연동 후 아래 입력 필드를 활성화하고 저장 로직을 구현해야 합니다 (planApi.updatePlan) */}
                  ⚠️ 수정 기능은 현재 준비 중입니다. 입력 필드는 조회 전용입니다.
                </div>
              )}

              {/* Plan Info Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-6">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="text-3xl font-bold text-slate-900 dark:text-slate-100 w-full px-4 py-2 border border-primary/20 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    ) : (
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {plan.title}
                      </h1>
                    )}
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
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editForm.participantCount}
                              onChange={(e) => setEditForm({ ...editForm, participantCount: Number(e.target.value) })}
                              className="text-base font-semibold text-slate-900 dark:text-slate-100 w-20 px-2 py-1 border border-primary/20 rounded bg-white dark:bg-slate-800"
                            />
                            <span className="text-sm text-slate-500">명</span>
                          </div>
                        ) : (
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {plan.participantCount}명
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 예산 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        payments
                      </span>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">예산</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editForm.totalBudget}
                              onChange={(e) => setEditForm({ ...editForm, totalBudget: Number(e.target.value) })}
                              className="text-base font-semibold text-slate-900 dark:text-slate-100 w-32 px-2 py-1 border border-primary/20 rounded bg-white dark:bg-slate-800"
                            />
                            <span className="text-sm text-slate-500">원</span>
                          </div>
                        ) : (
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {plan.formattedBudget}원
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 유형 */}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        location_on
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">유형</p>
                        {isEditing ? (
                          <select
                            value={editForm.planType}
                            onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}
                            className="text-base font-semibold text-slate-900 dark:text-slate-100 w-full px-2 py-1 border border-primary/20 rounded bg-white dark:bg-slate-800"
                          >
                            {['친목/회식', '데이트', '비즈니스'].map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {plan.planType}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 메모 */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">메모</p>
                    {isEditing ? (
                      <textarea
                        value={editForm.memo}
                        onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                        className="w-full px-4 py-3 border border-primary/20 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 outline-none"
                        rows={3}
                        placeholder="메모를 입력하세요."
                      />
                    ) : (
                      <p className="text-base text-slate-700 dark:text-slate-300">{plan.memo || '메모가 없습니다.'}</p>
                    )}
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
              아래 링크를 복사하여 카카오톡으로 공유하세요.
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
