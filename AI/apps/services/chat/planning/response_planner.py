"""
응답 표면(FOLLOW_UP / PLACE_CANDIDATES)과 facet 기반 질문 전략.

슬롯 missing 리스트 대신 next_facet + QuestionStrategy로 NLG에 전달한다.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from apps.services.chat.planning.facets import Facet


class ResponseSurface(str, Enum):
    FOLLOW_UP = "follow_up"
    PLACE_CANDIDATES = "place_candidates"


class QuestionStrategy(str, Enum):
    """NLG 프롬프트 분기."""

    FACET_EXPLORATION = "facet_exploration"  # 탐색형 — 축/카테고리 단위
    SLOT_DETAIL = "slot_detail"  # 좌표·시간 등 단일 슬롯


@dataclass(frozen=True)
class ResponsePlan:
    surface: ResponseSurface
    strategy: QuestionStrategy
    primary_facet: Facet
    """FollowupQuestionGenerator 폴백·컨텍스트용 대표 슬롯."""
    primary_target_slot: str
    planner_note: str = ""


def plan_follow_up_for_facet(
    *,
    facet: Facet,
    primary_target_slot: str,
    note: str = "",
) -> ResponsePlan:
    if facet in (Facet.LOCATION,):
        strategy = QuestionStrategy.SLOT_DETAIL
    elif facet == Facet.TIME:
        strategy = QuestionStrategy.SLOT_DETAIL
    else:
        strategy = QuestionStrategy.FACET_EXPLORATION
    return ResponsePlan(
        surface=ResponseSurface.FOLLOW_UP,
        strategy=strategy,
        primary_facet=facet,
        primary_target_slot=primary_target_slot,
        planner_note=note,
    )


def plan_location_follow_up() -> ResponsePlan:
    return plan_follow_up_for_facet(
        facet=Facet.LOCATION,
        primary_target_slot="lat",
        note="좌표 필요 — 지역 확인",
    )


def plan_place_candidates() -> ResponsePlan:
    return ResponsePlan(
        surface=ResponseSurface.PLACE_CANDIDATES,
        strategy=QuestionStrategy.SLOT_DETAIL,
        primary_facet=Facet.LOCATION,
        primary_target_slot="lat",
        planner_note="후보 장소 확인 단계",
    )
