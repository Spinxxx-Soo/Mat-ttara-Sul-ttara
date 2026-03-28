"""
추천 질문 단위를 슬롯이 아니라 facet(의사결정 축)으로 본다.

파서 출력은 기존 ParsedState(슬롯) 그대로 두고, 질문/완료 판정만 facet으로 묶는다.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional


class Facet(str, Enum):
    """탐색형 질문의 축."""

    TIME = "time"
    PARTY = "party"  # occasion_*
    CUISINE = "cuisine"
    VIBE = "vibe"  # vibe_* + seat_private + outdoor_ok
    CONSTRAINT = "constraint"  # 세부 제약 (야외/룸 등) — 선택
    AXIS_CHOICE = "axis_choice"  # 음식 종류 vs 분위기 어느 쪽을 먼저 정할지
    LOCATION = "location"  # lat/lng — 오케스트레이터 후반 분기


_CUISINE_PREFIX = "cuisine_"
_VIBE_KEYS = (
    "vibe_quiet",
    "vibe_lively",
    "vibe_modern",
    "vibe_traditional",
)
_OCCASION_PREFIX = "occasion_"


def _any_prefix(state: dict[str, Any], prefix: str) -> bool:
    return any(
        k.startswith(prefix) and state.get(k) is not None
        for k in state
    )


def _any_keys(state: dict[str, Any], keys: tuple[str, ...]) -> bool:
    return any(state.get(k) is not None for k in keys)


def facet_time_satisfied(state: dict[str, Any]) -> bool:
    return state.get("time") is not None


def facet_cuisine_satisfied(state: dict[str, Any]) -> bool:
    return _any_prefix(state, _CUISINE_PREFIX)


def facet_vibe_satisfied(state: dict[str, Any]) -> bool:
    if _any_keys(state, _VIBE_KEYS):
        return True
    if state.get("seat_private") is not None:
        return True
    if state.get("outdoor_ok") is not None:
        return True
    return False


def facet_party_satisfied(state: dict[str, Any]) -> bool:
    return _any_prefix(state, _OCCASION_PREFIX)


def facet_location_satisfied(state: dict[str, Any]) -> bool:
    return state.get("lat") is not None and state.get("lng") is not None


def representative_slot_for_facet(facet: Optional[Facet], state: dict[str, Any]) -> Optional[str]:
    """
    직전 턴 질문이 암시하는 슬롯 (짧은 응답 yes/no 보정용).
    AXIS_CHOICE는 단일 슬롯에 매핑하지 않음.
    """
    if facet is None:
        return None
    if facet == Facet.TIME:
        return "time"
    if facet == Facet.LOCATION:
        return "lat"
    if facet == Facet.AXIS_CHOICE:
        return None
    if facet == Facet.CUISINE:
        for k in state:
            if k.startswith(_CUISINE_PREFIX) and state.get(k) is None:
                return k
        return "cuisine_korean"
    if facet == Facet.VIBE:
        for k in _VIBE_KEYS:
            if state.get(k) is None:
                return k
        if state.get("seat_private") is None:
            return "seat_private"
        if state.get("outdoor_ok") is None:
            return "outdoor_ok"
        return "vibe_quiet"
    if facet == Facet.PARTY:
        for k in state:
            if k.startswith(_OCCASION_PREFIX) and state.get(k) is None:
                return k
        return "occasion_friends"
    if facet == Facet.CONSTRAINT:
        if state.get("outdoor_ok") is None:
            return "outdoor_ok"
        return "seat_private"
    return None
