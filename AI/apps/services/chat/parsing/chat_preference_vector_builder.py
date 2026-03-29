"""
preference_state(추상) → BE 추천 API가 기대하는 수치 벡터(extraData / ParsedState 슬롯).
"""
from __future__ import annotations

import json
import logging
from typing import Any

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


async def build_extra_data_llm(
    client: Any,
    *,
    preference_abstract: dict[str, Any],
    user_message: str,
    summary: str,
    previous_parsed_state: dict[str, Any],
) -> dict[str, Any]:
    """
    추상 선호 + 사용자 발화를 바탕으로 GPT가 추천 벡터만 JSON으로 생성합니다.
    """
    if not preference_abstract:
        return {}

    allowed = ", ".join(sorted(_VECTOR_KEYS))
    prev_vec = _vector_context_from_parsed(previous_parsed_state)

    prompt = (
        "당신은 장소 추천 시스템용 선호 벡터를 만드는 역할입니다.\n"
        "아래 [추상 선호]와 [사용자 발화]를 읽고, 장면에 맞는 선호도만 0.0~1.0 실수로 채우세요.\n\n"
        "규칙:\n"
        "- 출력은 JSON 객체 하나만 (설명·코드펜스 금지).\n"
        "- 키는 반드시 아래 목록 안에서만 사용: "
        f"{allowed}\n"
        "- lat, lng, time, selectedPlaceIds 는 절대 넣지 마세요.\n"
        "- 확신 없는 축은 키를 생략하거나 null.\n"
        "- 여러 요리/분위기가 동시에 어울리면 복수 키에 낮은~중간 값을 분배해도 됩니다.\n\n"
        f"[대화 요약]\n{summary or '없음'}\n\n"
        f"[이전 수치 벡터(참고)]\n{json.dumps(prev_vec, ensure_ascii=False)}\n\n"
        f"[추상 선호]\n{json.dumps(preference_abstract, ensure_ascii=False)}\n\n"
        f"[사용자 발화]\n{user_message}\n"
    )

    try:
        response = await client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.0,
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
        return filtered
    except Exception as e:
        logger.warning("[preference-vector-llm] failed: %s", e)
        return {}
