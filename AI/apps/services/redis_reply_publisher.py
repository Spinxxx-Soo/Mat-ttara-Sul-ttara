"""
BE가 구독하는 Redis Pub/Sub 채널(ai:reply)로 챗 응답을 발행합니다.
LangGraph RedisSaver(checkpointer)와 클라이언트·역할을 분리합니다.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import redis

from apps.schemas.chat import ChatMessageResponse, ParsedState

logger = logging.getLogger(__name__)

AI_REPLY_CHANNEL = "ai:reply"


def parsed_state_to_be_session_state(parsed: ParsedState | None) -> dict[str, Any] | None:
    """
    BE AiChatResponse.parsedState 타입은 SessionState(lat, lng, time, extraData)입니다.
    AI ParsedState의 나머지 필드는 extraData에 넣어 역직렬화·저장 시 손실을 줄입니다.
    """
    if parsed is None:
        return None

    # BE SessionState.extraData에 대해 "없으면 null로" 요구사항을 만족하기 위해
    # exclude_none=False로 전체 키를 유지합니다.
    raw = parsed.model_dump(mode="json", exclude_none=False)

    lat = raw.pop("lat", None)
    lng = raw.pop("lng", None)
    time_val = raw.pop("time", None)
    final_place_ids = raw.pop("selectedPlaceIds", None)

    return {
        "lat": lat,
        "lng": lng,
        "time": time_val,
        "finalPlaceIds": final_place_ids,
        "extraData": raw,
    }

def build_be_ai_reply_redis_payload(
    *,
    thread_id: str,
    user_id: int,
    response: ChatMessageResponse,
) -> dict[str, Any]:
    """BE RedisSubscribeListener → ObjectMapper → AiChatResponse 에 맞춘 JSON 객체."""
    payload = {
        "threadId": thread_id,
        "userId": user_id,
        "chatResponse": response.chatResponse,
        "type": response.type.value,
        "memoryStatus": response.memoryStatus.value,
        "parsedState": parsed_state_to_be_session_state(response.parsedState),
        "title": response.title,
        "places": (
            [p.model_dump(mode="json") for p in response.places]
            if response.places is not None
            else None
        ),
    }

    # 디버깅용: BE에서 값이 안 보일 때 어떤 payload가 나갔는지 확인
    # (너무 큰 parsedState/places를 통째로 찍지 않기 위해 일부만 요약 출력)
    try:
        ps = payload.get("parsedState") or {}
        logger.info(
            "[ai:reply publish] type=%s title=%s lat=%s lng=%s time=%s finalPlaceIds=%s places=%s",
            payload.get("type"),
            payload.get("title"),
            ps.get("lat"),
            ps.get("lng"),
            ps.get("time"),
            (ps.get("finalPlaceIds") if isinstance(ps, dict) else None),
            (len(payload["places"]) if isinstance(payload.get("places"), list) else None),
        )
    except Exception:
        # 로깅 실패는 서비스 동작에 영향 주지 않음
        pass

    return payload


class RedisReplyPublisher:
    def __init__(self, redis_url: str | None) -> None:
        self._url = redis_url.strip() if redis_url else None
        self._client: redis.Redis | None = None

    def publish_chat_reply(self, payload: dict[str, Any]) -> None:
        if not self._url:
            return
        try:
            if self._client is None:
                self._client = redis.Redis.from_url(self._url, decode_responses=True)
            self._client.publish(AI_REPLY_CHANNEL, json.dumps(payload, ensure_ascii=False))
        except Exception as e:
            logger.warning(
                "Redis Pub/Sub publish 실패 (HTTP 응답은 정상 진행): channel=%s err=%s",
                AI_REPLY_CHANNEL,
                e,
            )
