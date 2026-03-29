"""
preference_state(추상) → BE 추천 API가 기대하는 수치 벡터(extraData / ParsedState 슬롯).
"""
from __future__ import annotations

import json
import logging
from typing import Any

from apps.config import settings
from apps.schemas.chat_schemas import parsed_state_mergeable_keys

logger = logging.getLogger(__name__)

# GPT가 채울 수 있는 키 (좌표·시간·selectedPlaceIds 제외)
_VECTOR_KEYS: frozenset[str] = frozenset(
    parsed_state_mergeable_keys() - {"time", "lat", "lng"}
)


def _clamp01(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v < 0.0:
        return 0.0
    if v > 1.0:
        return 1.0
    return v


def _filter_vector_dict(raw: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in raw.items():
        if k not in _VECTOR_KEYS:
            continue
        if v is None:
            continue
        c = _clamp01(v)
        if c is not None:
            out[k] = c
    return out


def _safe_json_loads(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _vector_context_from_parsed(previous_parsed_state: dict[str, Any]) -> dict[str, Any]:
    return {k: previous_parsed_state.get(k) for k in sorted(_VECTOR_KEYS)}


def _has_any_inference_context(
    preference_abstract: dict[str, Any],
    preference_profile: dict[str, Any] | None,
    user_message: str,
    summary: str,
    prev_vec: dict[str, Any],
) -> bool:
    if preference_abstract:
        return True
    if preference_profile:
        return True
    if (user_message or "").strip():
        return True
    if (summary or "").strip():
        return True
    return any(v is not None for v in prev_vec.values())


async def build_extra_data_llm(
    client: Any,
    *,
    preference_abstract: dict[str, Any],
    user_message: str,
    summary: str,
    previous_parsed_state: dict[str, Any],
    preference_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    추상 선호 + (선택) 유저 프로필 + 사용자 발화 → GPT가 24축 수치 벡터(JSON) 생성.
    한 가지 슬롯만 말해도 연관 축을 합리적으로 추론해 채우도록 프롬프트에 명시한다.
    """
    allowed = ", ".join(sorted(_VECTOR_KEYS))
    prev_vec = _vector_context_from_parsed(previous_parsed_state)
    profile = preference_profile if preference_profile else {}

    if not _has_any_inference_context(preference_abstract, profile, user_message, summary, prev_vec):
        return {}

    prompt = (
        "당신은 장소 추천 시스템용 선호 벡터를 만드는 역할입니다.\n"
        "아래 [유저 프로필]·[추상 선호]·[대화 요약]·[사용자 발화]·[이전 수치 벡터]를 종합해 "
        "각 축에 0.0~1.0 실수를 채우세요.\n\n"
        "★ 암시적 추론(중요):\n"
        "- 사용자가 **한 가지**(예: 음식 종류, 시간, 동행만)만 말해도, 맥락상 자연스러운 "
        "**연관 축**을 추론해 채웁니다. (예: 한식만 언급 → 회식/친구 모임 맥락이 있으면 "
        "occasion_business·occasion_friends·vibe_lively 등에 0.25~0.75 수준으로 반영)\n"
        "- [유저 프로필]의 usageType(사적/공적)·ageGroup·gender는 분위기·목적 추론의 근거로 사용합니다. "
        "(예: 공적·회사 성격 → occasion_business↑, 사적+연령대 → occasion_friends/date 가늠)\n"
        "- 추론값은 보통 0.2~0.85 사이로, **확신이 매우 낮을 때만** 키를 생략합니다.\n"
        "- 서로 모순되게 높은 값을 동시에 주지 마세요(예: vibe_quiet와 vibe_lively 동시 최대).\n"
        "- [이전 수치 벡터]가 있으면 **이번 턴 발화·요약이 뚜렷하면** 새 추론으로 갱신 우선.\n\n"
        "형식 규칙:\n"
        "- 출력은 JSON 객체 하나만 (설명·코드펜스 금지).\n"
        "- 키는 반드시 아래 목록 안에서만 사용: "
        f"{allowed}\n"
        "- lat, lng, time, selectedPlaceIds 는 절대 넣지 마세요.\n"
        "- 여러 요리/분위기가 동시에 어울리면 복수 키에 값을 분배해도 됩니다.\n\n"
        f"[유저 프로필 요약]\n{json.dumps(profile, ensure_ascii=False) if profile else '없음'}\n\n"
        f"[대화 요약]\n{summary or '없음'}\n\n"
        f"[이전 수치 벡터(참고)]\n{json.dumps(prev_vec, ensure_ascii=False)}\n\n"
        f"[추상 선호]\n{json.dumps(preference_abstract, ensure_ascii=False)}\n\n"
        f"[사용자 발화]\n{user_message}\n"
    )

    try:
        response = await client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=520,
            temperature=0.15,
        )
        content = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
            .strip()
        )
        parsed = _safe_json_loads(content)
        filtered = _filter_vector_dict(parsed)
        logger.info("[preference-vector-llm] keys=%s", list(filtered.keys()))
        if settings.debug_vector_pipeline:
            logger.info(
                "[preference-vector-llm] raw_parsed_keys=%s filtered_json=%s",
                list(parsed.keys()),
                json.dumps(filtered, ensure_ascii=False),
            )
            dropped = [k for k in parsed if k not in filtered]
            if dropped:
                logger.info(
                    "[preference-vector-llm] dropped_or_invalid_keys=%s",
                    dropped,
                )
        return filtered
    except Exception as e:
        logger.warning("[preference-vector-llm] failed: %s", e)
        return {}
