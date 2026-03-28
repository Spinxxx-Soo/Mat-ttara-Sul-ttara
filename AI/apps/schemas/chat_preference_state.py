"""
AI 내부 선호 추상 레이어 (preference_state).

- BE `SessionState.extraData`에 실리는 수치 벡터(cuisine_*, vibe_*, …)와 분리합니다.
- 스레드별로 LangGraph 체크포인트(예: Redis DB 1)에만 저장합니다.
"""
from __future__ import annotations

from typing import Any, Literal

# 추상 슬롯 (LLM·규칙 파서 출력)
Mood = Literal["quiet", "lively", "modern", "traditional"]
Social = Literal["friends", "date", "business", "family", "solo"]
Food = Literal["korean", "japanese", "chinese", "western", "bunsik", "asian_other", "any"]
Intent = Literal["meal", "drink", "cafe"]
Space = Literal["private", "open", "outdoor"]

# 체크포인트에 넣는 상관용 식별자 (다중 유저·다중 세션)
PREFERENCE_CONTEXT_KEYS: frozenset[str] = frozenset({"userId", "threadId"})


def merge_abstract_preference(
    previous: dict[str, Any],
    delta: dict[str, Any],
) -> dict[str, Any]:
    """이전 추상 선호에 이번 턴 델타를 병합 (None/빈 문자열은 스킵)."""
    base = {
        k: v
        for k, v in previous.items()
        if k not in PREFERENCE_CONTEXT_KEYS and v is not None and v != ""
    }
    for k, v in delta.items():
        if k in PREFERENCE_CONTEXT_KEYS:
            continue
        if v is None or v == "":
            continue
        base[k] = v
    return base


def strip_preference_for_builder(pref: dict[str, Any]) -> dict[str, Any]:
    """apps.services.chat.parsing.chat_preference_vector_builder 입력: 상관 키 제외."""
    return {k: v for k, v in pref.items() if k not in PREFERENCE_CONTEXT_KEYS}


def attach_preference_context(
    abstract: dict[str, Any],
    *,
    user_id: int,
    thread_id: str,
) -> dict[str, Any]:
    """체크포인트 저장용: 추상 선호 + userId/threadId."""
    out = dict(abstract)
    out["userId"] = user_id
    out["threadId"] = thread_id
    return out
