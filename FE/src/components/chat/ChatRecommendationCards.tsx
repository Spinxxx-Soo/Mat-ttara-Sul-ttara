import type { Place } from '@/types/api'
import { getPlaceKey, resolveNumericPlaceId } from '@/lib/placeIdentity'

type ChatRecommendationCardsProps = {
  places: Place[]
  selectedPlaceId: number | null
  onSelectPlace: (place: Place) => void
}

/**
 * AI 답변 말풍선 아래에 붙는 추천 가게 미니 카드. 탭 시 지도 말풍선과 동기됨.
 */
export function ChatRecommendationCards({
  places,
  selectedPlaceId,
  onSelectPlace,
}: ChatRecommendationCardsProps) {
  if (places.length === 0) return null

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-primary">
        추천 장소
      </p>
      <div className="flex max-h-[min(40vh,320px)] flex-col gap-2 overflow-y-auto pr-0.5">
        {places.map((place) => {
          const id = resolveNumericPlaceId(place)
          const active = id != null && selectedPlaceId === id
          return (
            <button
              type="button"
              key={getPlaceKey(place)}
              onClick={() => onSelectPlace(place)}
              className={`flex w-full shrink-0 gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                  : 'border-slate-200 bg-slate-50/90 hover:border-primary/40 hover:bg-white dark:border-slate-600 dark:bg-slate-900/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                {place.imageUrl ? (
                  <img
                    src={place.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[22px] text-slate-400">
                    restaurant
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                  {place.name}
                </div>
                {place.recommendReason ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                    {place.recommendReason}
                  </p>
                ) : place.address ? (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{place.address}</p>
                ) : null}
                {place.rating != null && Number(place.rating) > 0 ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    <span className="material-symbols-outlined text-[12px]">star</span>
                    {place.rating}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
