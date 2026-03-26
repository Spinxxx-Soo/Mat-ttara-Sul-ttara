"""
BE가 구독하는 Redis Pub/Sub 채널(ai:reply)로 챗 응답을 발행합니다.
LangGraph RedisSaver(checkpointer)와 클라이언트·역할을 분리합니다.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import redis

from apps.schemas.chat import ChatMessageRequest, ChatMessageResponse, ParsedState

logger = logging.getLogger(__name__)

AI_REPLY_CHANNEL = "ai:reply"


def parsed_state_to_be_session_state(parsed: ParsedState | None) -> dict[str, Any] | None:
    """
    BE AiChatResponse.parsedState 타입은 SessionState(lat, lng, time, extraData)입니다.
    AI ParsedState의 나머지 필드는 extraData에 넣어 역직렬화·저장 시 손실을 줄입니다.
    """
    if parsed is None:
        return None
    raw = parsed.model_dump(mode="json", exclude_none=True)
    lat = raw.pop("lat", None)
    lng = raw.pop("lng", None)
    time_val = raw.pop("time", None)
    out: dict[str, Any] = {}
    if lat is not None:
        out["lat"] = lat
    if lng is not None:
        out["lng"] = lng
    if time_val is not None:
        out["time"] = time_val
    if raw:
        out["extraData"] = raw
    return out or None


def build_be_ai_reply_redis_payload(
    request: ChatMessageRequest,
    response: ChatMessageResponse,
) -> dict[str, Any]:
    """BE RedisSubscribeListener → ObjectMapper → AiChatResponse 에 맞춘 JSON 객체."""
    return {
        "threadId": response.threadId,
        "userId": request.userId,
        "chatResponse": response.chatResponse,
        "type": response.type.value,
        "memoryStatus": response.memoryStatus.value,
        "parsedState": parsed_state_to_be_session_state(response.parsedState),
    }


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
