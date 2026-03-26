// ==========================================
// 지도 위 가게 상세 카드 (핀 클릭 시) — 리뷰 보기 진입
// CustomOverlay: 카드 본문 UI는 기존(하단 고정 카드)과 동일, 아래에 말풍선 꼬리만 추가
// ==========================================

import type { Place } from '@/types/api'

export interface PlaceMapDetailCardProps {
  place: Place
  onClose: () => void
  onReviewClick: () => void
}

const formatPlaceRating = (place: Place): string | null => {
  const rating = place.rating ?? place.reviewScore
  if (rating == null) return null
  return `${rating.toFixed(1)}`
}

export default function PlaceMapDetailCard({
  place,
  onClose,
  onReviewClick,
}: PlaceMapDetailCardProps) {
  return (
    <div className="pointer-events-auto flex flex-col">
      {/* 기존과 동일한 카드 본문 (정렬·타이포 그대로) */}
      <div className="w-[min(calc(100vw-2rem),24rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-black text-slate-900 dark:text-slate-100">
              {place.name}
            </h3>
            {place.category && (
              <p className="mt-0.5 text-[11px] font-bold text-primary">{place.category}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <p className="mt-2 flex items-start gap-1 text-xs text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-slate-400">
            location_on
          </span>
          <span className="line-clamp-2">{place.address}</span>
        </p>

        {place.phone && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{place.phone}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {formatPlaceRating(place) && (
            <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 dark:bg-amber-900/30">
              <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
              <span className="text-sm font-black text-amber-800 dark:text-amber-400">
                {formatPlaceRating(place)}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onReviewClick}
            className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90"
          >
            리뷰 보기
          </button>
        </div>
      </div>

      {/* 말풍선 꼬리 — 카드 가로 중앙 기준 */}
      <div className="flex w-full justify-center">
        <div
          className="-mt-px h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent border-t-white dark:border-t-slate-900"
          aria-hidden
        />
      </div>
    </div>
  )
}
