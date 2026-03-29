"""
추천 이유(recommendReason)를 LLM으로 짧고 부드러운 말투로 재작성.
실패·파싱 오류 시 원문을 그대로 반환.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Sequence

from apps.services.chat.openai_client import OpenAIClient

_logger = logging.getLogger(__name__)

_MAX_REASON_LEN = 220


def _safe_json_loads(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _clip(s: str) -> str:
    s = s.strip()
    if len(s) > _MAX_REASON_LEN:
        return s[: _MAX_REASON_LEN - 1] + "…"
    return s


async def rewrite_recommend_reasons_batch(
    client: OpenAIClient,
    *,
    place_drafts: Sequence[tuple[str, str]],
    preference_summary: str | None = None,
) -> list[str]:
    """
    (가게명, 시스템 초안) 순서를 유지한 채 재작성된 문구 리스트 반환.
    """
    drafts = [(str(n or "").strip(), str(r or "").strip()) for n, r in place_drafts]
    if not drafts:
        return []

    originals = [r for _, r in drafts]
    if not any(originals):
        return originals

    lines = []
    for i, (name, draft) in enumerate(drafts, start=1):
        lines.append(f"{i}. [{name}] {draft}")

    system = (
        "당신은 장소 추천 앱의 카피라이터입니다.\n"
        "입력은 시스템이 만든 딱딱한 '추천 이유' 초안입니다.\n"
        "각 항목을 **한 문장**으로만 다시 쓰세요. 말투는 친근한 구어체(반말·존댓말 섞지 말고 일관되게 '~어요' 체).\n\n"
        "규칙:\n"
        "- 핵심만 남기고 짧게. 장황한 설명·보고서 톤 금지.\n"
        "- '유사도', '점수', 숫자 소수(0.xxx)는 절대 넣지 마세요.\n"
        "- '대화에서 정리된', '프로필', '반영한 후보' 같은 기계적 표현은 피하고 자연스러운 말로 바꿉니다.\n"
        "- 가게 이름은 이미 UI에 있으므로 문장 안에서 굳이 반복하지 않아도 됩니다. 필요할 때만 짧게.\n"
        "- 초안에 있는 음식·분위기·상황 정보는 빠뜨리지 말되, 과장·환각 금지.\n"
        "- 출력은 JSON만: {\"reasons\": [\"...\", \"...\", ...]} 형식.\n"
        "- reasons 배열 길이와 순서는 입력 항목 수·순서와 **반드시 동일**해야 합니다.\n"
    )
    user_parts = [
        "아래 각 줄을 순서대로 재작성해 reasons 배열에 넣으세요.\n",
        "\n".join(lines),
    ]
    if preference_summary and str(preference_summary).strip():
        user_parts.append("\n[사용자 취향 요약(참고만)]\n" + str(preference_summary).strip()[:800])

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]

    try:
        response = await client.chat_completion(
            messages=messages,
            max_tokens=500,
            temperature=0.45,
        )
        content = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
    except Exception as e:
        _logger.warning("recommend_reason rewrite LLM failed: %s", e)
        return originals

    parsed = _safe_json_loads(content)
    reasons = parsed.get("reasons")
    if not isinstance(reasons, list):
        _logger.warning("recommend_reason rewrite: invalid JSON shape")
        return originals

    out: list[str] = []
    for i in range(len(drafts)):
        cell = reasons[i] if i < len(reasons) else None
        if isinstance(cell, str) and cell.strip():
            out.append(_clip(cell))
        else:
            out.append(originals[i])

    if len(out) != len(originals):
        return originals

    return out
