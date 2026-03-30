"""
추천용 시간 슬롯만 추출 (규칙 + LLM). lat/lng·수치 벡터는 다루지 않음.
"""
from __future__ import annotations

import json
from typing import Any


class TimeSlotParser:
    """규칙 + LLM(time만). lat/lng·수치 벡터는 다루지 않음."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def parse_rules(self, user_message: str) -> dict[str, Any]:
        result: dict[str, Any] = {}

        if any(k in user_message for k in ("아침", "조식", "브런치")):
            result["time"] = "아침"
        elif any(k in user_message for k in ("점심", "런치")):
            result["time"] = "점심"
        elif any(k in user_message for k in ("저녁", "디너", "퇴근 후")):
            result["time"] = "저녁"
        elif any(k in user_message for k in ("밤", "늦은 시간", "야식")):
            result["time"] = "밤"

        return result

    async def parse_llm(
        self,
        *,
        user_message: str,
        summary: str,
        previous_parsed_state: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = (
            "아래 사용자 발화에서 '시간'만 JSON으로 추출하세요.\n"
            "반드시 JSON만 출력하세요.\n\n"
            "필드 (명확하지 않으면 null):\n"
            "- time: 시간대 문자열 또는 HH:MM\n"
            "lat, lng, 좌표, cuisine, vibe, occasion 필드는 절대 넣지 마세요 "
            "(좌표는 백엔드가 별도로 전달합니다).\n\n"
            f"[기존 요약]\n{summary or '없음'}\n\n"
            f"[기존 time]\n{previous_parsed_state.get('time')}\n\n"
            f"[사용자 발화]\n{user_message}\n"
        )
        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.0,
        )
        content = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
            .strip()
        )
        return self._safe_json_loads(content)

    def _safe_json_loads(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(cleaned)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def merge_results(
        self,
        rule_result: dict[str, Any],
        llm_result: dict[str, Any],
    ) -> dict[str, Any]:
        merged = dict(rule_result)
        v = llm_result.get("time")
        if v is not None and v != "":
            merged["time"] = v
        return merged

    def convert_time_to_time_value(self, time_str: str) -> str:
        time_mapping = {
            "아침": "08:00",
            "조식": "08:00",
            "브런치": "10:00",
            "점심": "12:00",
            "런치": "12:00",
            "저녁": "18:00",
            "디너": "18:00",
            "퇴근 후": "18:00",
            "밤": "21:00",
            "늦은 시간": "21:00",
            "야식": "22:00",
        }
        if ":" in time_str and len(time_str) <= 8:
            return time_str
        return time_mapping.get(time_str.strip(), time_str)
