from __future__ import annotations

from typing import Any, Iterable

from apps.services.memory_types import PreferenceEvent, PreferenceProfile
from apps.services.preference_registry import get_key_meta


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


class PreferenceUpdater:
    """
    PreferenceProfile 업데이트 책임 분리:
    - 이전 점수(0~1)와 이벤트(value) 가중 평균
    - clamp(0~1)
    - (현재는 decay 없음)
    """

    def update(self, *, previous_profile: PreferenceProfile, events: Iterable[PreferenceEvent]) -> PreferenceProfile:
        updated: PreferenceProfile = dict(previous_profile)

        for event in events:
            meta = get_key_meta(event["key"])
            if not meta or not meta.used_for_long_term_memory:
                # 추천용 키는 long-term 프로필에 누적하지 않음
                continue

            old_score = float(updated.get(event["key"], 0.5))
            weight = float(event["weight"])
            new_score = old_score * (1 - weight) + float(event["value"]) * weight
            updated[event["key"]] = _clamp01(new_score)

        return updated

