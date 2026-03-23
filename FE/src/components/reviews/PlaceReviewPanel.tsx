// ==========================================
// 가게 리뷰 사이드 패널 (S14P21B205-24)
// ==========================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import {
  usePlaceReviewsList,
  useCreatePlaceReview,
  useUpdatePlaceReview,
  useDeletePlaceReview,
} from '@/hooks/queries/place/usePlaceReviews'
import { extractApiErrorMessage } from '@/lib/apiUtils'
import type { Review } from '@/types/api'

const PAGE_SIZE = 10

function StarRow({
  rating,
  interactive,
  onPick,
  size = 'md',
}: {
  rating: number
  interactive?: boolean
  onPick?: (n: number) => void
  size?: 'sm' | 'md'
}) {
  const iconSize = size === 'sm' ? 'text-[16px]' : 'text-[22px]'
  return (
    <div className="flex gap-0.5 items-center" role={interactive ? 'group' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(rating)
        const star = (
          <span
            className={`material-symbols-outlined ${iconSize} ${
              filled ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        )
        if (interactive) {
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick?.(n)}
              className="p-0.5 rounded transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer"
              aria-label={`${n}점`}
            >
              {star}
            </button>
          )
        }
        return (
          <span key={n} className="p-0.5" aria-hidden>
            {star}
          </span>
        )
      })}
    </div>
  )
}

export interface PlaceReviewPanelProps {
  placeId: number
  placeName: string
  onBack: () => void
}

export default function PlaceReviewPanel({
  placeId,
  placeName,
  onBack,
}: PlaceReviewPanelProps) {
  const { user, isLoggedIn } = useAuthStore()
  const [page, setPage] = useState(1)
  const [newRating, setNewRating] = useState(5)
  const [newContent, setNewContent] = useState('')
  const [editing, setEditing] = useState<{
    reviewId: number
    rating: number
    content: string
  } | null>(null)

  const { data, isLoading, isError, error, refetch } = usePlaceReviewsList(
    placeId,
    page,
    PAGE_SIZE
  )
  const createMutation = useCreatePlaceReview(placeId)
  const updateMutation = useUpdatePlaceReview(placeId)
  const deleteMutation = useDeletePlaceReview(placeId)

  const reviews = data?.content ?? []
  const pageInfo = data?.pageInfo
  const averageRating = data?.averageRating

  useEffect(() => {
    setPage(1)
    setNewContent('')
    setNewRating(5)
    setEditing(null)
  }, [placeId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) {
      toast.error('리뷰 내용을 입력해주세요.')
      return
    }
    try {
      await createMutation.mutateAsync({
        rating: newRating,
        content: newContent.trim(),
      })
      toast.success('리뷰가 등록되었습니다.')
      setNewContent('')
      setNewRating(5)
    } catch {
      /* axios / RQ meta에서 토스트 처리될 수 있음 */
    }
  }

  const startEdit = (r: Review) => {
    setEditing({
      reviewId: r.reviewId,
      rating: r.rating,
      content: r.content,
    })
  }

  const cancelEdit = () => setEditing(null)

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.content.trim()) {
      toast.error('리뷰 내용을 입력해주세요.')
      return
    }
    try {
      await updateMutation.mutateAsync({
        reviewId: editing.reviewId,
        body: { rating: editing.rating, content: editing.content.trim() },
      })
      toast.success('리뷰가 수정되었습니다.')
      setEditing(null)
    } catch {
      // handled globally
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm('이 리뷰를 삭제할까요?')) return
    try {
      await deleteMutation.mutateAsync(reviewId)
      toast.success('리뷰가 삭제되었습니다.')
    } catch {
      // handled globally
    }
  }

  const isMine = (r: Review) =>
    user != null && r.userId != null && r.userId === user.userId

  return (
    <aside className="flex h-full min-h-0 w-full flex-1 flex-col bg-white dark:bg-slate-900 z-20 relative">
      <div className="p-4 border-b border-primary/5 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary mb-3 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          돌아가기
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <span className="text-primary truncate" title={placeName}>
            {placeName}
          </span>
          <span className="text-sm font-normal text-slate-500 shrink-0">리뷰</span>
        </h1>
        {averageRating != null && (
          <div className="mt-2 flex items-center gap-2">
            <StarRow rating={averageRating} size="sm" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {averageRating.toFixed(1)}
            </span>
            {pageInfo != null && (
              <span className="text-xs text-slate-400">
                ({pageInfo.totalElements}건)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">리뷰를 불러오는 중...</p>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
            <p className="font-semibold mb-1">불러오기 실패</p>
            <p className="text-xs opacity-90">
              {extractApiErrorMessage(error, '잠시 후 다시 시도해주세요.')}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-xs font-bold text-primary underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !isError && reviews.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            아직 등록된 리뷰가 없습니다.
          </div>
        )}

        {!isLoading &&
          !isError &&
          reviews.map((r) => (
            <article
              key={r.reviewId}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
            >
              {editing?.reviewId === r.reviewId ? (
                <div className="space-y-3">
                  <StarRow
                    rating={editing.rating}
                    interactive
                    onPick={(n) =>
                      setEditing((prev) => (prev ? { ...prev, rating: n } : prev))
                    }
                  />
                  <textarea
                    value={editing.content}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, content: e.target.value } : prev
                      )
                    }
                    rows={4}
                    className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {r.userName ?? '익명'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(r.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <StarRow rating={r.rating} size="sm" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {r.content}
                  </p>
                  {isMine(r) && (
                    <div className="mt-3 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.reviewId)}
                        disabled={deleteMutation.isPending}
                        className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
      </div>

      {/* 새 리뷰 작성 */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        {!isLoggedIn ? (
          <p className="text-xs text-center text-slate-500">
            리뷰를 작성하려면{' '}
            <Link to="/login" className="font-bold text-primary underline">
              로그인
            </Link>
            이 필요합니다.
          </p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">리뷰 작성</p>
            <StarRow
              rating={newRating}
              interactive
              onPick={setNewRating}
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="맛집 경험을 남겨주세요."
              rows={3}
              maxLength={2000}
              className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '리뷰 등록'}
            </button>
          </form>
        )}
      </div>

      {pageInfo != null && pageInfo.totalPages > 1 && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-2 items-center text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded bg-primary/10 text-primary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-slate-500">
            {page} / {pageInfo.totalPages}
          </span>
          <button
            type="button"
            disabled={!pageInfo.hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded bg-primary/10 text-primary disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </aside>
  )
}
