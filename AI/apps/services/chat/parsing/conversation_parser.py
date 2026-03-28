"""
대화 문맥 해석 전용 (추천 수치 슬롯 추출과 분리).

yes/no, 직전 슬롯 힌트에 대한 짧은 응답, (향후) 수정 의도·확정/보류 등 확장 예정.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal, Optional

from apps.schemas.chat_schemas import parsed_state_mergeable_keys


@dataclass
class DialogueTurnResult:
    """대화 파서 출력 — parsed_state에 합쳐질 델타만 우선 사용."""

    parsed_delta: dict[str, Any]
    yes_no: Optional[Literal["yes", "no", "neutral"]] = None
    recommend_intent: Optional[Literal["refine", "replace", "hold", "unknown"]] = None
    stance: Optional[Literal["confirm", "defer", "unknown"]] = None


class ConversationParser:
    """
    짧은 응답·찬반 등 대화 신호만 다룸.
    추천용 시간/선호/벡터는 RecommendationParser가 담당.
    """

    def parse_turn(
        self,
        *,
        user_message: str,
        target_slot_hint: Optional[str],
        previous_parsed_state: dict[str, Any],
    ) -> DialogueTurnResult:
        delta = self._short_answer_for_slot_hint(
            user_message=user_message,
            target_slot_hint=target_slot_hint,
            previous_parsed_state=previous_parsed_state,
        )
        yes_no = self._infer_yes_no(user_message)
        return DialogueTurnResult(parsed_delta=delta, yes_no=yes_no, stance=None, recommend_intent=None)

    def _short_answer_for_slot_hint(
        self,
        *,
        user_message: str,
        target_slot_hint: Optional[str],
        previous_parsed_state: dict[str, Any],
    ) -> dict[str, Any]:
        if not target_slot_hint:
            return {}
        if target_slot_hint not in parsed_state_mergeable_keys():
            return {}
        if target_slot_hint in {"time", "lat", "lng"}:
            return {}
        if previous_parsed_state.get(target_slot_hint) is not None:
            return {}

        normalized = re.sub(r"\s+", "", user_message.strip().lower())
        if not normalized:
            return {}

        positive_tokens = {
            "네", "예", "응", "엉", "ㅇㅇ", "넵", "넹",
            "맞아", "맞아요", "맞음", "좋아", "좋아요",
            "괜찮아", "괜찮아요", "가능", "오케이", "ok",
        }
        negative_tokens = {
            "아니", "아뇨", "아니요", "ㄴㄴ", "노",
            "싫어", "싫어요", "별로", "안돼", "안되",
        }
        no_preference_tokens = {
            "없어", "없어요", "없습니다", "딱히", "상관없어", "아무거나",
        }

        if normalized in positive_tokens:
            return {target_slot_hint: 1.0}
        if normalized in negative_tokens:
            return {target_slot_hint: 0.0}
        if normalized in no_preference_tokens:
            return {target_slot_hint: 0.5}

        return {}

    def _infer_yes_no(self, user_message: str) -> Optional[Literal["yes", "no", "neutral"]]:
        normalized = re.sub(r"\s+", "", user_message.strip().lower())
        if not normalized:
            return None
        if normalized in {
            "네", "예", "응", "엉", "ㅇㅇ", "넵", "넹", "맞아", "맞아요", "좋아", "좋아요", "ok", "오케이",
        }:
            return "yes"
        if normalized in {
            "아니", "아뇨", "아니요", "ㄴㄴ", "노", "싫어", "싫어요", "별로",
        }:
            return "no"
        return "neutral"
