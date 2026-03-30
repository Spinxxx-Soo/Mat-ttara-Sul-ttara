"""
추천에 필요한 정보만 추출·병합 (시간, 추상 선호, 수치 벡터).

지역(lat/lng)은 BE SessionState에서 병합(ParsedStateManager)되는 것을 전제로,
발화에서는 시간·선호·벡터만 갱신한다.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from apps.schemas.chat_preference_state import (
    attach_preference_context,
    strip_preference_for_builder,
)
from apps.schemas.chat_schemas import parsed_state_mergeable_keys
from apps.services.chat.parsing.chat_preference_parser import PreferenceParser
from apps.services.chat.parsing.chat_preference_vector_builder import build_extra_data_llm
from apps.services.chat.parsing.time_slot_parser import TimeSlotParser

logger = logging.getLogger(__name__)


@dataclass
class RecommendationTurnResult:
    merged_parsed_state: dict[str, Any]
    merged_preference_state: dict[str, Any]


class RecommendationParser:
    """시간 + 추상 preference_state + GPT 수치 벡터 → parsed_state / preference_state."""

    def __init__(self, client: Any) -> None:
        self.client = client
        self._time = TimeSlotParser(client)
        self._preference = PreferenceParser(client)

    async def parse_turn(
        self,
        *,
        user_message: str,
        summary: str,
        previous_parsed_state: dict[str, Any],
        previous_preference_state: dict[str, Any],
        thread_id: str,
        user_id: int,
        preference_profile: dict[str, Any] | None = None,
    ) -> RecommendationTurnResult:
        logger.info(
            "[recommendation-parser] user_text=%s thread_id=%s user_id=%s profile_keys=%s",
            user_message,
            thread_id,
            user_id,
            list((preference_profile or {}).keys()),
        )

        conv_rule = self._time.parse_rules(user_message)
        conv_llm = await self._time.parse_llm(
            user_message=user_message,
            summary=summary,
            previous_parsed_state=previous_parsed_state,
        )
        conv_delta = self._time.merge_results(conv_rule, conv_llm)
        if conv_delta.get("time"):
            conv_delta["time"] = self._time.convert_time_to_time_value(str(conv_delta["time"]))

        pref_abstract = await self._preference.parse_turn(
            user_message=user_message,
            summary=summary,
            previous_preference_state=previous_preference_state,
        )
        pref_stored = attach_preference_context(
            pref_abstract,
            user_id=user_id,
            thread_id=thread_id,
        )
        vector_delta = await build_extra_data_llm(
            self.client,
            preference_abstract=strip_preference_for_builder(pref_stored),
            user_message=user_message,
            summary=summary,
            previous_parsed_state=previous_parsed_state,
            preference_profile=preference_profile,
        )

        parsed_update = self._merge_slot_dicts(conv_delta, vector_delta)
        merged_parsed_state = self.merge_parsed_state(
            previous=previous_parsed_state,
            new=parsed_update,
        )

        logger.info("[recommendation-parser] parsed_delta=%s", parsed_update)
        return RecommendationTurnResult(
            merged_parsed_state=merged_parsed_state,
            merged_preference_state=pref_stored,
        )

    def _merge_slot_dicts(self, a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
        out = dict(a)
        for key, value in b.items():
            if value is not None and value != "":
                out[key] = value
        return out

    def merge_parsed_state(
        self,
        previous: dict[str, Any],
        new: dict[str, Any],
    ) -> dict[str, Any]:
        merged = dict(previous)
        allowed_keys = parsed_state_mergeable_keys()
        for key, value in new.items():
            if key not in allowed_keys:
                continue
            if value is None or value == "":
                continue
            merged[key] = value
        return merged
