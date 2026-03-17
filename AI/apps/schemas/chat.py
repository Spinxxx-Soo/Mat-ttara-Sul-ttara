"""
챗봇 관련 Request / Response 스키마 정의

설계 원칙
- API 명세의 camelCase 필드명 유지
- 공통 필드는 베이스 모델로 추출
- 조건부 응답은 타입별 모델로 분리
- Pydantic v2 기준으로 검증 로직 구성
"""

from __future__ import annotations

from typing import List, Optional, Literal, TypeAlias
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, model_validator


# ============================================================
# Common Base
# ============================================================

class APIModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",          # 명세 외 필드 유입 차단
        validate_assignment=True # 생성 후 필드 변경 시에도 검증
    )


# ============================================================
# Literal Type Aliases
# ============================================================

ContextInjectionReason: TypeAlias = Literal[
    "THREAD_INIT",
    "ONBOARDING_UPDATE",
    "FORCE_SYNC",
    "MISSING_MEMORY",
]

# ============================================================
# Shared Domain Models
# ============================================================

class BaseState(APIModel):
    """대화 문맥에서 공통으로 사용하는 상태 필드."""

    area: Optional[str] = None
    people: Optional[int] = Field(default=None, ge=1)
    time: Optional[str] = None
    purpose: Optional[str] = None
    mood: Optional[str] = None

#채팅 정보
class ChatResponseType(str, Enum):
    RECOMMENDATION = "RECOMMENDATION"
    FOLLOW_UP = "FOLLOW_UP"
    CLARIFICATION = "CLARIFICATION"

#단기 기억 저장
class MemoryStatus(str, Enum):
    OK = "OK"
    MISSING = "MISSING"
    STALE = "STALE"

#스레드 정보
class SessionState(BaseState):
    excludedPlaceIds: List[int] = Field(default_factory=list)


class ParsedState(BaseState):
    """LLM 또는 파서가 추출한 상태 정보."""
    pass

#사용자 장기 메모리
class PreferenceSummary(APIModel):
    preferredVibes: List[str] = Field(default_factory=list)
    avoidedVibes: List[str] = Field(default_factory=list)
    preferredCategories: List[str] = Field(default_factory=list)
    preferredPriceLevel: Optional[int] = Field(default=None, ge=1)

#장소 추천 
class Filters(BaseState):
    preferredVibes: List[str] = Field(default_factory=list)
    avoidedVibes: List[str] = Field(default_factory=list)
    preferredCategories: List[str] = Field(default_factory=list)
    preferredPriceLevel: Optional[int] = Field(default=None, ge=1)

#컨텍스트 주입
class ContextInjection(APIModel):
    reason: ContextInjectionReason

#장소추천
class PlaceInfo(APIModel):
    placeId: int
    name: str
    lat: float
    lng: float
    address: str
    recommendReason: str
    tags: List[str] = Field(default_factory=list)


# ============================================================
# Request Schemas
# ============================================================

class ChatMessageRequest(APIModel):
    """챗 메시지 처리 요청."""

    userId: int
    threadId: str
    message: str = Field(min_length=1)

    contextInjection: Optional[ContextInjection] = None
    sessionState: Optional[SessionState] = None
    preferenceSummary: Optional[PreferenceSummary] = None

    @model_validator(mode="after")
    def validate_context_requirements(self) -> "ChatMessageRequest":
        """
        AI 서버 내부의 유저 컨텍스트 메모리가 날아갔을 경우 주입 받아야함
        """
        if self.contextInjection is None:
            return self

        if self.contextInjection.reason == "MISSING_MEMORY":
            if self.sessionState is None and self.preferenceSummary is None:
                raise ValueError(
                    "When contextInjection.reason is 'MISSING_MEMORY', "
                    "either sessionState or preferenceSummary must be provided."
                )

        return self


class PlaceCandidatesRequest(APIModel):
    """장소 후보 조회 요청."""

    threadId: str
    filters: Filters
    excludedPlaceIds: List[int] = Field(default_factory=list)
    limit: int = Field(default=20, ge=1, le=100)


# ============================================================
# Response Schemas (MVP Simple Version)
# ============================================================

class ChatMessageResponse(APIModel):
    threadId: str
    type: ChatResponseType
    memoryStatus: MemoryStatus
    needFollowUp: bool
    chatResponse: str = Field(min_length=1)
    parsedState: Optional[ParsedState] = None
    # 추천일 경우만 채워짐
    places: List[PlaceInfo] = Field(default_factory=list)


# 현재 구조상 동일 응답 재사용
PlaceCandidatesResponse: TypeAlias = ChatMessageResponse