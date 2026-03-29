"""장소·추천 관련 HTTP 엔드포인트."""
import logging

from fastapi import APIRouter, HTTPException

from apps.config import redis_be_bridge_connection_url, settings
from apps.repositories.recommend_repository import RecommendRepository
from apps.schemas.chat_schemas import (
    AiPlaceCandidatesRequest,
    ChatMessageResponse,
    ChatResponseType,
    MemoryStatus,
    ParsedState as ParsedStateSchema,
    PlaceInfo,
)
from apps.services.chat.bridge.redis_reply_publisher import (
    RedisReplyPublisher,
    build_be_ai_reply_redis_payload,
)
from apps.services.chat.openai_client import OpenAIClient
from apps.services.place.recommend_reason import build_recommend_reason
from apps.services.place.recommend_reason_rewrite import rewrite_recommend_reasons_batch
from apps.services.place.recommend_service import RecommendService

router = APIRouter()
recommend_service = RecommendService()
recommend_repo = RecommendRepository()
redis_reply_publisher = RedisReplyPublisher(redis_be_bridge_connection_url())
_openai_for_reason_rewrite = OpenAIClient()
_logger = logging.getLogger(__name__)


@router.post("/api/v1/internal/ai/place_candidates", response_model=ChatMessageResponse)
async def get_place_candidates(request: AiPlaceCandidatesRequest):
    """
    후보 장소 조회 API -> 추후 redis 변경
    """
    try:
        session_state = request.sessionState
        final_place_ids = session_state.finalPlaceIds or []
        _logger.info(
            "[ai:place_candidates] thread=%s user=%s finalPlaceIds=%s lat=%s lng=%s time=%s",
            request.threadId,
            request.userId,
            final_place_ids,
            session_state.lat,
            session_state.lng,
            session_state.time,
        )

        short_term: dict[str, object] = session_state.extraData or {}

        def _coerce_numeric_short_term(raw: dict[str, object]) -> dict[str, float]:
            out: dict[str, float] = {}
            for k, v in raw.items():
                if v is None:
                    continue
                try:
                    out[str(k)] = float(v)
                except (TypeError, ValueError):
                    continue
            return out

        short_term_numeric = _coerce_numeric_short_term(short_term)

        parsed_state: dict[str, object] = {
            "lat": session_state.lat,
            "lng": session_state.lng,
            "time": session_state.time,
            "selectedPlaceIds": final_place_ids or None,
        }
        for k in ParsedStateSchema.model_fields.keys():
            if k in parsed_state:
                continue
            parsed_state[k] = short_term.get(k)

        preference_summary = getattr(request, "preferenceSummary", None)
        _logger.debug("parsed_state=%s preference_summary=%s", parsed_state, preference_summary)

        rec_run = recommend_service.run_recommendation(
            user_id=request.userId,
            place_ids=final_place_ids,
            short_term=short_term_numeric,
            top_k=3,
        )
        results = rec_run.ranked
        _logger.info("[ai:place_candidates] results=%s", results)

        place_details = recommend_repo.get_places_details([pid for pid, _ in results])

        places: list[PlaceInfo] = []
        for place_id, score in results:
            details = place_details.get(place_id, {})
            if not details:
                continue
            pvec = rec_run.place_vectors.get(place_id)
            reason = build_recommend_reason(
                place_name=str(details.get("name") or ""),
                category=str(details.get("category") or "") or None,
                similarity=float(score),
                user_vector=rec_run.user_vector,
                place_vector=pvec,
                short_term=short_term,
            )
            places.append(
                PlaceInfo(
                    placeId=place_id,
                    name=str(details.get("name") or ""),
                    lat=float(details.get("lat")),
                    lng=float(details.get("lng")),
                    address=str(details.get("address") or ""),
                    recommendReason=reason,
                    tags=[str(details.get("category"))] if details.get("category") else [],
                )
            )

        if places and settings.rewrite_recommend_reason_llm:
            drafts = [(p.name, p.recommendReason or "") for p in places]
            try:
                rewritten = await rewrite_recommend_reasons_batch(
                    _openai_for_reason_rewrite,
                    place_drafts=drafts,
                    preference_summary=preference_summary
                    if isinstance(preference_summary, str)
                    else None,
                )
                if len(rewritten) == len(places):
                    for i, p in enumerate(places):
                        places[i] = p.model_copy(update={"recommendReason": rewritten[i]})
            except Exception as e:
                _logger.warning("[ai:place_candidates] recommendReason rewrite skipped: %s", e)

        if not places:
            response_text = (
                "조건에 맞는 추천 장소를 찾지 못했어요. "
                "지도를 움직이거나 대화로 조건을 조정한 뒤 다시 시도해 주세요."
            )
        else:
            intro = (
                "지도에 추천 장소를 표시했어요.\n"
                "플랜으로 만들 가게는 지도에서 핀을 눌러 선택해 주세요.\n\n"
            )
            lines: list[str] = []
            for i, p in enumerate(places, start=1):
                reason = (p.recommendReason or "").strip() or "대화에서 정리된 조건에 맞는 곳이에요."
                lines.append(f"{i}. {p.name} — {reason}")
            response_text = intro + "\n".join(lines)

        response = ChatMessageResponse(
            threadId=request.threadId,
            userId=request.userId,
            chatResponse=response_text,
            type=ChatResponseType.RECOMMENDATION,
            memoryStatus=MemoryStatus.OK,
            parsedState=ParsedStateSchema(**parsed_state),
            places=places,
        )

        redis_reply_publisher.publish_chat_reply(
            build_be_ai_reply_redis_payload(
                thread_id=request.threadId,
                user_id=request.userId,
                response=response,
            )
        )

        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"장소 후보 조회 중 오류가 발생했습니다: {str(e)}",
        )
