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

from pydantic import BaseModel, Field, ConfigDict, model_validator


# ============================================================
# Common Base
# ============================================================

class APIModel(BaseModel):
    """모든 API 스키마의 공통 베이스 모델."""

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

MemoryStatus: TypeAlias = Literal["OK", "MISSING", "STALE"]

ChatResponseType: TypeAlias = Literal[
    "RECOMMENDATION",
    "FOLLOW_UP",
    "CLARIFICATION",
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


class SessionState(BaseState):
    """현재 스레드/세션 기준의 상태 정보."""

    excludedPlaceIds: List[int] = Field(default_factory=list)


class ParsedState(BaseState):
    """LLM 또는 파서가 추출한 상태 정보."""

    pass


class PreferenceSummary(APIModel):
    """사용자 선호도 요약 정보."""

    preferredVibes: List[str] = Field(default_factory=list)
    avoidedVibes: List[str] = Field(default_factory=list)
    preferredCategories: List[str] = Field(default_factory=list)
    preferredPriceLevel: Optional[int] = Field(default=None, ge=1)


class Filters(BaseState):
    """장소 후보 조회 시 사용하는 필터 정보."""

    preferredVibes: List[str] = Field(default_factory=list)
    avoidedVibes: List[str] = Field(default_factory=list)
    preferredCategories: List[str] = Field(default_factory=list)
    preferredPriceLevel: Optional[int] = Field(default=None, ge=1)


class ContextInjection(APIModel):
    """컨텍스트 주입 메타 정보."""

    reason: ContextInjectionReason


class PlaceInfo(APIModel):
    """추천 결과로 내려주는 장소 정보."""

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
        컨텍스트 주입 사유가 MISSING_MEMORY인 경우,
        복구 가능한 상태 정보(sessionState 또는 preferenceSummary)가 필요하다.
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
# Response Schemas
# ============================================================

class BaseChatResponse(APIModel):
    """모든 챗 응답의 공통 필드."""

    threadId: str
    memoryStatus: MemoryStatus
    needFollowUp: bool
    chatResponse: str = Field(min_length=1)
    parsedState: Optional[ParsedState] = None


class RecommendationResponse(BaseChatResponse):
    """추천 완료 응답."""

    type: Literal["RECOMMENDATION"]
    places: List[PlaceInfo] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_business_rules(self) -> "RecommendationResponse":
        """
        추천 응답 규칙
        - places는 최소 1개 이상이어야 한다.
        - 추천이 확정된 응답이므로 needFollowUp은 False여야 한다.
        """
        if self.needFollowUp:
            raise ValueError(
                "RecommendationResponse requires needFollowUp=False."
            )
        return self


class FollowUpResponse(BaseChatResponse):
    """추가 정보가 필요할 때의 응답."""

    type: Literal["FOLLOW_UP"]
    needFollowUp: Literal[True] = True
    places: List[PlaceInfo] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_business_rules(self) -> "FollowUpResponse":
        """
        추가 질문 응답 규칙
        - 일반적으로 장소 리스트를 포함하지 않는다.
        """
        if self.places:
            raise ValueError(
                "FollowUpResponse must not include places."
            )
        return self


class ClarificationResponse(BaseChatResponse):
    """사용자 입력이 모호하여 명확화가 필요할 때의 응답."""

    type: Literal["CLARIFICATION"]
    needFollowUp: Literal[True] = True
    places: List[PlaceInfo] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_business_rules(self) -> "ClarificationResponse":
        """
        명확화 요청 응답 규칙
        - 일반적으로 장소 리스트를 포함하지 않는다.
        """
        if self.places:
            raise ValueError(
                "ClarificationResponse must not include places."
            )
        return self


# ============================================================
# Public Response Type Aliases
# ============================================================

ChatMessageResponse: TypeAlias = (
    RecommendationResponse
    | FollowUpResponse
    | ClarificationResponse
)

# 현재 구조상 동일 응답을 재사용
PlaceCandidatesResponse: TypeAlias = ChatMessageResponse