"""
facet + 전략에 맞춰 LLM으로 탐색형/슬롯형 질문을 생성한다.
"""
from __future__ import annotations

from typing import Any

from apps.services.chat.generation.chat_followup_question_generator import FollowupQuestionGenerator
from apps.services.chat.planning.facets import Facet
from apps.services.chat.planning.response_planner import QuestionStrategy, ResponsePlan, ResponseSurface


def _facet_exploration_addon(facet: Facet) -> str:
    """슬롯 추궁이 아닌 카테고리·의사결정 축 탐색 지시."""
    if facet == Facet.AXIS_CHOICE:
        return (
            "\n\n[질문 전략 — 플래너: 의사결정 축 탐색]\n"
            "이번 턴에는 cuisine_korean, cuisine_japanese처럼 개별 음식 슬롯을 하나씩 묻지 마세요.\n"
            "대신 '음식 종류(한식·일식 등)를 먼저 정할지, 분위기를 먼저 정할지'처럼 "
            "큰 축에서 한 가지만 고르게 돕는 한 문장 질문을 하세요.\n"
            "예시 뉘앙스: '오늘은 어떤 느낌이세요? 음식 종류가 더 중요해요, 아니면 분위기가 더 중요해요?'\n"
            "JSON question 필드에 그 한 문장만 넣으세요."
        )
    if facet == Facet.CUISINE:
        return (
            "\n\n[질문 전략 — 플래너: 음식 facet 탐색]\n"
            "개별 슬롯(한식만/일식만)을 나열해 캐묻지 마세요. "
            "한식·일식·중식·양식·분식 등을 한 번에 넓게 묻는 한 문장으로 작성하세요."
        )
    if facet == Facet.VIBE:
        return (
            "\n\n[질문 전략 — 플래너: 분위기 facet 탐색]\n"
            "vibe_quiet, vibe_lively 등 세부 슬롯을 하나씩 묻지 마세요. "
            "조용함/활기/모던/데이트 느낌/가성비 등 사용자가 느끼는 우선순위를 넓게 묻는 한 문장으로 작성하세요."
        )
    if facet == Facet.PARTY:
        return (
            "\n\n[질문 전략 — 플래너: 모임 목적 facet]\n"
            "occasion_date, occasion_friends 등을 하나씩 캐지 말고, "
            "데이트·친구·가족·혼자·회식 등 목적을 한 번에 묻는 한 문장으로 작성하세요."
        )
    return (
        "\n\n[질문 전략 — 플래너: 탐색형]\n"
        "세부 슬롯을 나열하지 말고, 해당 주제를 한 문장으로 넓게 물어보세요."
    )


def _slot_detail_addon(facet: Facet) -> str:
    if facet == Facet.TIME:
        return (
            "\n\n[질문 전략]\n"
            "시간대를 자연스럽게 한 문장으로만 묻세요. "
            "다른 슬롯(음식·분위기)은 건드리지 마세요."
        )
    if facet == Facet.LOCATION:
        return (
            "\n\n[질문 전략]\n"
            "어느 지역/동네 쪽인지 자연스럽게 한 문장으로만 묻세요."
        )
    return ""


def _build_planner_addon(plan: ResponsePlan) -> str:
    if plan.strategy == QuestionStrategy.FACET_EXPLORATION:
        return _facet_exploration_addon(plan.primary_facet)
    return _slot_detail_addon(plan.primary_facet)


class ResponseNLG:
    def __init__(self, followup_generator: FollowupQuestionGenerator) -> None:
        self._followup = followup_generator

    async def render_follow_up(
        self,
        *,
        plan: ResponsePlan,
        user_message: str,
        parsed_state: dict[str, Any],
        thread_id: str,
    ) -> str:
        if plan.surface != ResponseSurface.FOLLOW_UP:
            raise ValueError("render_follow_up는 FOLLOW_UP plan만 처리합니다.")

        addon = _build_planner_addon(plan)
        return await self._followup.generate_question(
            user_message=user_message,
            parsed_state=parsed_state,
            target_slot=plan.primary_target_slot,
            thread_id=thread_id,
            planner_addon=addon,
        )
