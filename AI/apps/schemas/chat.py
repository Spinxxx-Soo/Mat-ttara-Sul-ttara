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

#단기 기억 저장
class MemoryStatus(str, Enum):
    OK = "OK"
    MISSING = "MISSING"

#스레드 정보 (요청용 SessionState)
class SessionState(APIModel):
    """플랜 파싱 정보 (요청에서 memoryStatus=MISSING 일 때만 채워지는 정보)."""

    lat: Optional[float] = Field(
        default=None,
        description="위도",
    )
    lng: Optional[float] = Field(
        default=None,
        description="경도",
    )
    people: Optional[int] = Field(
        default=None,
        description="인원수",
        example=2,
        ge=1,
    )
    time: Optional[str] = Field(
        default=None,
        description="시간(자연어)",
        example="저녁",
    )
    purpose: Optional[str] = Field(
        default=None,
        description="목적",
    )
    mood: Optional[str] = Field(
        default=None,
        description="분위기",
    )
    excludedPlaceIds: List[int] = Field(
        default_factory=list,
        description="제외할 장소 ID 목록",
    )


# 응답용 ParsedState
class ParsedState(APIModel):
    """LLM 또는 파서가 추출한 상태 정보 (응답에 포함되는 필드)."""

    lat: Optional[float] = Field(
        default=None,
        description="위도",
    )
    lng: Optional[float] = Field(
        default=None,
        description="경도",
    )
    time: Optional[str] = Field(
        default=None,
        description="파싱된 시간",
        example="18:00",
    )
    people: Optional[int] = Field(
        default=None,
        description="인원수",
        example=3,
        ge=1,
    )
    purpose: Optional[str] = Field(
        default=None,
        description="목적",
        example="술자리",
    )
    mood: Optional[str] = Field(
        default=None,
        description="분위기",
    )


#사용자 장기 메모리
class PreferenceSummary(APIModel):
    preferredVibes: Optional[List[str]] = Field(
        default=None,
        description="선호 분위기 목록",
        example=["조용함"],
    )
    avoidedVibes: Optional[List[str]] = Field(
        default=None,
        description="피하고 싶은 분위기 목록",
        example=["시끄러움"],
    )
    preferredCategories: Optional[List[str]] = Field(
        default=None,
        description="선호 카테고리",
        example=["이자카야"],
    )
    preferredPriceLevel: Optional[int] = Field(
        default=None,
        description="선호 가격대(1~N)",
        example=2,
        ge=1,
    )

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
    """챗 메시지 처리 요청 (ChatRequest)."""

    userId: int = Field(..., example=1)
    threadId: str = Field(..., example="chat-101")
    message: str = Field(..., min_length=1, example="강남 쪽이면 좋겠어")

    # 내부 컨텍스트 주입용 (기존 로직 유지)
    contextInjection: Optional[ContextInjection] = None

    # memoryStatus=MISSING 일 때만 채워지는 플랜 파싱 정보
    sessionState: Optional[SessionState] = Field(
        default=None,
        description="memoryStatus=MISSING 일 때만 채워지는 플랜 파싱 정보",
    )

    # memoryStatus=MISSING 일 때만 채워지는 장기 메모리 요약
    preferenceSummary: Optional[PreferenceSummary] = Field(
        default=None,
        description="memoryStatus=MISSING 일 때만 채워지는 장기 메모리 요약",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "summary": "기본 요청",
                    "value": {
                        "userId": 1,
                        "threadId": "chat-101",
                        "message": "강남 쪽이면 좋겠어",
                    },
                },
                {
                    "summary": "memoryStatus=MISSING 시 요청",
                    "value": {
                        "userId": 1,
                        "threadId": "chat-101",
                        "message": "친구랑 저녁에 만나려고",
                        "sessionState": {
                            "lat": None,
                            "lng": None,
                            "people": 2,
                            "time": "저녁",
                            "purpose": None,
                            "mood": None,
                        },
                        "preferenceSummary": {
                            "preferredVibes": ["조용함"],
                            "avoidedVibes": ["시끄러움"],
                            "preferredCategories": ["이자카야"],
                            "preferredPriceLevel": None,
                        },
                    },
                },
            ]
        }
    )

    @model_validator(mode="after")
    def validate_context_requirements(self) -> "ChatMessageRequest":
        """
        AI 서버 내부의 유저 컨텍스트 메모리가 날아갔을 경우 주입 받아야함.
        (기존 로직 유지)
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
    """챗봇 응답 (ChatResponse)."""

    threadId: str = Field(..., example="chat-101")
    userId: int = Field(..., example=101)
    chatResponse: str = Field(
        ...,
        min_length=1,
        example="어떤 분위기를 원하세요?",
    )
    type: ChatResponseType = Field(
        ...,
        description="응답 타입",
        example=ChatResponseType.FOLLOW_UP.value,
    )
    # FOLLOW_UP일 때는 백엔드가 선택한 슬롯, RECOMMENDATION일 때는 None
    targetSlot: Optional[str] = Field(
        default=None,
        description="이번 턴에 질문한 슬롯 키 (예: time, purpose, people, mood)",
        example="time",
    )
    memoryStatus: MemoryStatus = Field(
        ...,
        description="메모리 상태",
        example=MemoryStatus.OK.value,
    )
    parsedState: Optional[ParsedState] = Field(
        default=None,
        description="AI가 파싱한 상태 정보",
        example={
            "lat": None,
            "lng": None,
            "time": "18:00",
            "people": 3,
            "purpose": "술자리",
            "mood": None,
        },
    )


# 현재 구조상 동일 응답 재사용
PlaceCandidatesResponse: TypeAlias = ChatMessageResponse