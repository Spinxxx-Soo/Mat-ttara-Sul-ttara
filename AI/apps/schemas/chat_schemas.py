"""
챗봇 관련 Request / Response 스키마 정의
"""

from __future__ import annotations

from typing import Any, List, Optional, Literal, TypeAlias
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
    PLACE_CANDIDATES = "PLACE_CANDIDATES"

#단기 기억 저장
class MemoryStatus(str, Enum):
    OK = "OK"
    MISSING = "MISSING"

#스레드 정보 (요청용 SessionState)
class SessionState(APIModel):
    """
    BE 요청/동기화에 사용되는 세션 상태 모델.

    - lat/lng/time: 위치/시간대 파싱 결과
    - finalPlaceIds: 후보 장소 ID (BE가 PLACE_CANDIDATES 이후 주입)
    - extraData: cuisine/vibe/seat/outdoor/occasion 등 파서 결과를 담는 Map
    """

    lat: Optional[float] = Field(default=None, description="위도")
    lng: Optional[float] = Field(default=None, description="경도")
    time: Optional[str] = Field(default=None, description="시간값 (HH:mm 또는 자연어)")

    # BE가 SessionState에 함께 들고 넘기는 필드(현재 AI 로직에서는 선택적으로 사용)
    title: Optional[str] = Field(default=None, description="세션/플랜 제목(옵션)")
    meetingDate: Optional[str] = Field(default=None, description="약속 날짜(옵션: yyyy-MM-dd)")

    finalPlaceIds: Optional[List[int]] = Field(
        default=None, description="BE가 필터링한 후보 장소 ID 리스트"
    )

    # cuisine_* / vibe_* / seat_private / outdoor_ok / occasion_* 등을 포함
    extraData: Optional[dict[str, Any]] = Field(
        default=None, description="추천용 파서 값 Map"
    )


# 응답용 ParsedState — API·파서·Redis state 단일 소스 (협약 스키마)
class ParsedState(APIModel):
    """
    대화/파싱 상태의 단일 스키마.
    - time, lat, lng: 파서·세션에서 채움
    - selectedPlaceIds: 주로 백엔드가 후보 주입 (AI는 보통 비움)
    - cuisine_*, vibe_*, seat_*, outdoor_ok, occasion_*: 추천용 선호 점수 0~1 (AI 파서가 단계적으로 채움)
    """

    lat: Optional[float] = Field(default=None, description="위도")
    lng: Optional[float] = Field(default=None, description="경도")
    time: Optional[str] = Field(
        default=None,
        description="시간값 (예: 18:00)",
        example="18:00",
    )

    selectedPlaceIds: Optional[List[int]] = Field(
        default=None,
        description="추천 후보 장소 ID (백엔드 주입 위주)",
    )

    cuisine_korean: Optional[float] = Field(default=None, description="한식 선호 0~1", ge=0, le=1)
    cuisine_japanese: Optional[float] = Field(default=None, description="일식 선호 0~1", ge=0, le=1)
    cuisine_chinese: Optional[float] = Field(default=None, description="중식 선호 0~1", ge=0, le=1)
    cuisine_western: Optional[float] = Field(default=None, description="양식 선호 0~1", ge=0, le=1)
    cuisine_bunsik: Optional[float] = Field(default=None, description="분식 선호 0~1", ge=0, le=1)
    cuisine_asian_other: Optional[float] = Field(default=None, description="기타 아시안 선호 0~1", ge=0, le=1)

    vibe_quiet: Optional[float] = Field(default=None, description="조용한 분위기 0~1", ge=0, le=1)
    vibe_lively: Optional[float] = Field(default=None, description="활기찬 분위기 0~1", ge=0, le=1)
    vibe_modern: Optional[float] = Field(default=None, description="모던/깔끔 0~1", ge=0, le=1)
    vibe_traditional: Optional[float] = Field(default=None, description="전통/고풍 0~1", ge=0, le=1)

    seat_private: Optional[float] = Field(default=None, description="프라이빗 좌석 선호 0~1", ge=0, le=1)
    outdoor_ok: Optional[float] = Field(default=None, description="야외/테라스 OK 0~1", ge=0, le=1)

    occasion_date: Optional[float] = Field(default=None, description="데이트 0~1", ge=0, le=1)
    occasion_business: Optional[float] = Field(default=None, description="비즈니스/미팅 0~1", ge=0, le=1)
    occasion_family: Optional[float] = Field(default=None, description="가족 0~1", ge=0, le=1)
    occasion_solo: Optional[float] = Field(default=None, description="혼자 0~1", ge=0, le=1)
    occasion_friends: Optional[float] = Field(default=None, description="친구/모임 0~1", ge=0, le=1)

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        json_schema_extra={
            "example": {
                "lat": None,
                "lng": None,
                "time": "18:00",
                "selectedPlaceIds": [101, 202, 303],
                "cuisine_korean": 0.9,
                "cuisine_japanese": 0.4,
                "cuisine_chinese": None,
                "cuisine_western": None,
                "cuisine_bunsik": None,
                "cuisine_asian_other": None,
                "vibe_quiet": None,
                "vibe_lively": None,
                "vibe_modern": None,
                "vibe_traditional": None,
                "seat_private": None,
                "outdoor_ok": None,
                "occasion_date": None,
                "occasion_business": None,
                "occasion_family": None,
                "occasion_solo": None,
                "occasion_friends": 1.0,
            }
        },
    )


def parsed_state_mergeable_keys() -> frozenset[str]:
    """파서 출력으로 이전 state를 덮어쓸 수 있는 필드 (BE 전용 selectedPlaceIds 제외)."""
    return frozenset(ParsedState.model_fields.keys()) - {"selectedPlaceIds"}


#사용자 장기 메모리
class PreferenceSummary(APIModel):
    # BE 요청 스키마(usageType/ageGroup/gender)
    usageType: Optional[str] = Field(default=None, description="사적/공적 모임 성격")
    ageGroup: Optional[str] = Field(default=None, description="참여자 연령대")
    gender: Optional[str] = Field(default=None, description="선호 성별/분위기")

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
    # 제목 생성 필요 여부 (BE에서 전달)
    needTitle: bool = Field(default=False, description="첫 채팅일 경우 제목 생성 요청 여부")

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


class AiPlaceCandidatesRequest(APIModel):
    """
    BE가 PLACE_CANDIDATES 이후 내부로 AI 서버에 보내는 요청.
    (AiService.sendCandidatesToAi -> /api/v1/internal/ai/place_candidates)
    """

    threadId: str
    userId: int
    sessionState: SessionState


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
    memoryStatus: MemoryStatus = Field(
        ...,
        description="메모리 상태",
        example=MemoryStatus.OK.value,
    )
    parsedState: Optional[ParsedState] = Field(
        default=None,
        description="AI가 파싱한 상태 정보 (ParsedState 단일 스키마)",
    )

    # 채팅방 제목(선택)
    title: Optional[str] = Field(
        default=None,
        description="AI가 요약한 채팅방 제목",
    )

    # 추천 장소 목록(선택)
    places: Optional[List[PlaceInfo]] = Field(
        default=None,
        description="추천 장소 리스트",
    )

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        json_schema_extra={
            "examples": [
                {
                    "threadId": "chat-101",
                    "userId": "101",
                    "chatResponse": "어떤 분위기를 원하세요?",
                    "type": "FOLLOW_UP",
                    "memoryStatus": "OK",
                    "parsedState": {
                        "lat": None,
                        "lng": None,
                        "time": "18:00",
                        "selectedPlaceIds": [101, 202, 303],
                        "cuisine_korean": 0.9,
                        "cuisine_japanese": 0.4,
                        "cuisine_chinese": None,
                        "cuisine_western": None,
                        "cuisine_bunsik": None,
                        "cuisine_asian_other": None,
                        "vibe_quiet": None,
                        "vibe_lively": None,
                        "vibe_modern": None,
                        "vibe_traditional": None,
                        "seat_private": None,
                        "outdoor_ok": None,
                        "occasion_date": None,
                        "occasion_business": None,
                        "occasion_family": None,
                        "occasion_solo": None,
                        "occasion_friends": 1.0,
                    },
                }
            ]
        },
    )


# 현재 구조상 동일 응답 재사용
PlaceCandidatesResponse: TypeAlias = ChatMessageResponse