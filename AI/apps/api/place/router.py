"""장소·추천 관련 HTTP 엔드포인트."""
import logging

from fastapi import APIRouter, HTTPException

from apps.config import redis_be_bridge_connection_url
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
from apps.services.place.recommend_service import RecommendService

router = APIRouter()
recommend_service = RecommendService()
recommend_repo = RecommendRepository()
redis_reply_publisher = RedisReplyPublisher(redis_be_bridge_connection_url())
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

        results = recommend_service.recommend(
            user_id=request.userId,
            place_ids=final_place_ids,
            short_term=short_term,
            top_k=3,
        )
        _logger.info("[ai:place_candidates] results=%s", results)

        place_details = recommend_repo.get_places_details([pid for pid, _ in results])

        def _pick_label_from_scores(prefix: str, value_map: dict[str, object]) -> str | None:
            label_map = {
                "cuisine_korean": "한식",
                "cuisine_japanese": "일식",
                "cuisine_chinese": "중식",
                "cuisine_western": "양식",
                "cuisine_bunsik": "분식",
                "cuisine_asian_other": "기타 아시안",
                "vibe_quiet": "조용한 분위기",
                "vibe_lively": "활기찬 분위기",
                "vibe_modern": "모던/깔끔한 분위기",
                "vibe_traditional": "전통/고풍 분위기",
                "occasion_date": "데이트",
                "occasion_business": "비즈니스 미팅",
                "occasion_family": "가족",
                "occasion_solo": "혼자",
                "occasion_friends": "친구/모임",
            }
            best_key = None
            best_val = None
            for key, val in value_map.items():
                if key not in label_map:
                    continue
                if best_val is None and val is None:
                    continue
                if val is None:
                    continue
                if best_val is None or float(val) > float(best_val):
                    best_key = key
                    best_val = val
            if best_key is None:
                return None
            return label_map.get(best_key)

        cuisine_label = _pick_label_from_scores("cuisine", short_term) or "선호하는 음식"
        vibe_label = _pick_label_from_scores("vibe", short_term) or "원하시는 분위기"
        occasion_label = _pick_label_from_scores("occasion", short_term) or "모임 목적"

        def _build_reason() -> str:
            return f"{cuisine_label}과 {vibe_label} 분위기에 맞고, {occasion_label}에 어울리는 장소라 추천드립니다."

        places: list[PlaceInfo] = []
        for place_id, score in results:
            details = place_details.get(place_id, {})
            if not details:
                continue
            places.append(
                PlaceInfo(
                    placeId=place_id,
                    name=str(details.get("name") or ""),
                    lat=float(details.get("lat")),
                    lng=float(details.get("lng")),
                    address=str(details.get("address") or ""),
                    recommendReason=_build_reason(),
                    tags=[str(details.get("category"))] if details.get("category") else [],
                )
            )

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
