from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class PreferenceKeyMeta:
    used_for_recommendation: bool
    used_for_long_term_memory: bool
    description: str


# ============================================================
# Active recommendation keys (현재 추천 점수 계산에 직접 사용)
# ============================================================
_ACTIVE_RECOMMENDATION_KEYS: Dict[str, PreferenceKeyMeta] = {
    # cuisine
    "cuisine_korean": PreferenceKeyMeta(True, False, "한식"),
    "cuisine_japanese": PreferenceKeyMeta(True, False, "일식"),
    "cuisine_chinese": PreferenceKeyMeta(True, False, "중식"),
    "cuisine_western": PreferenceKeyMeta(True, False, "양식"),
    "cuisine_bunsik": PreferenceKeyMeta(True, False, "분식"),
    "cuisine_asian_other": PreferenceKeyMeta(True, False, "기타 아시안"),
    # vibe
    "vibe_quiet": PreferenceKeyMeta(True, False, "조용함"),
    "vibe_lively": PreferenceKeyMeta(True, False, "활기참"),
    "vibe_modern": PreferenceKeyMeta(True, False, "모던/깔끔"),
    "vibe_traditional": PreferenceKeyMeta(True, False, "전통/고풍"),
    # occasion
    "occasion_date": PreferenceKeyMeta(True, False, "데이트"),
    "occasion_business": PreferenceKeyMeta(True, False, "비즈니스/미팅/회식"),
    "occasion_family": PreferenceKeyMeta(True, False, "가족"),
    "occasion_solo": PreferenceKeyMeta(True, False, "혼자"),
    "occasion_friends": PreferenceKeyMeta(True, False, "친구/모임"),
}


# ============================================================
# Long-term-memory-only keys (장기 프로필 누적 전용)
# ============================================================
_LONG_TERM_ONLY_KEYS: Dict[str, PreferenceKeyMeta] = {
    # taste
    "taste_spicy": PreferenceKeyMeta(False, True, "매운맛 선호"),
    "taste_light": PreferenceKeyMeta(False, True, "라이트/담백 선호"),
    "taste_rich": PreferenceKeyMeta(False, True, "진하고 풍부한 맛 선호"),
    # price
    "price_range": PreferenceKeyMeta(False, True, "가격대 선호(낮음~높음)"),
    # seating / environment
    "seat_private": PreferenceKeyMeta(False, True, "프라이빗/조용한 좌석 선호"),
    "outdoor_ok": PreferenceKeyMeta(False, True, "야외/테라스 선호"),
    "crowd_tolerance": PreferenceKeyMeta(False, True, "붐빔 허용도(낮음~높음)"),
    "wait_tolerance": PreferenceKeyMeta(False, True, "웨이팅 허용도(낮음~높음)"),
    "parking_required": PreferenceKeyMeta(False, True, "주차 필요 여부"),
}


# ============================================================
# Unified registry
# ============================================================
PREFERENCE_KEY_REGISTRY: Dict[str, PreferenceKeyMeta] = {
    **_ACTIVE_RECOMMENDATION_KEYS,
    **_LONG_TERM_ONLY_KEYS,
}


def get_key_meta(key: str) -> PreferenceKeyMeta | None:
    return PREFERENCE_KEY_REGISTRY.get(key)


def list_long_term_memory_keys() -> List[str]:
    return [k for k, meta in PREFERENCE_KEY_REGISTRY.items() if meta.used_for_long_term_memory]


def list_recommendation_keys() -> List[str]:
    return [k for k, meta in PREFERENCE_KEY_REGISTRY.items() if meta.used_for_recommendation]

