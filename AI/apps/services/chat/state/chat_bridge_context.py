"""
BE ↔ AI HTTP 요청에서 식별·위치 힌트만 묶는 얇은 레이어 (대화 텍스트 파싱과 분리).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from apps.schemas.chat_schemas import ChatMessageRequest


@dataclass(frozen=True)
class BridgeContext:
    """멀티 유저·멀티 세션 상관 및 BE가 넘긴 좌표 힌트."""

    user_id: int
    thread_id: str
    session_lat: Optional[float] = None
    session_lng: Optional[float] = None

    @classmethod
    def from_request(cls, request: ChatMessageRequest) -> "BridgeContext":
        lat = lng = None
        if request.sessionState is not None:
            lat = request.sessionState.lat
            lng = request.sessionState.lng
        return cls(
            user_id=request.userId,
            thread_id=request.threadId,
            session_lat=lat,
            session_lng=lng,
        )

    def to_log_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "thread_id": self.thread_id,
            "session_lat": self.session_lat,
            "session_lng": self.session_lng,
        }
