"""
유저 발화 파싱 모듈
- 규칙 기반 + LLM 보조 방식
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional


class ChatParser:
    """사용자 발화에서 구조화된 상태를 추출하는 파서"""

    def __init__(self, client):
        self.client = client

    async def parse(
        self,
        user_message: str,
        summary: str,
        previous_parsed_state: dict[str, Any],
    ) -> dict[str, Any]:
        """
        유저 발화 파싱
        - 먼저 규칙 기반으로 추출
        - 부족한 값은 LLM으로 보완
        """
        rule_result = self._rule_based_parse(user_message)
        llm_result = await self._llm_parse(
            user_message=user_message,
            summary=summary,
            previous_parsed_state=previous_parsed_state,
        )

        return self._merge_results(rule_result, llm_result)

    def _rule_based_parse(self, user_message: str) -> dict[str, Any]:
        result: dict[str, Any] = {
            "area": None,
            "people": None,
            "time": None,
            "purpose": None,
            "mood": None,
            "budget": None,
        }

        # 인원 추출
        people_match = re.search(r"(\d+)\s*명", user_message)
        if people_match:
            result["people"] = int(people_match.group(1))

        # 시간대 추출
        if any(keyword in user_message for keyword in ["아침", "조식", "브런치"]):
            result["time"] = "아침"
        elif any(keyword in user_message for keyword in ["점심", "런치"]):
            result["time"] = "점심"
        elif any(keyword in user_message for keyword in ["저녁", "디너", "퇴근 후"]):
            result["time"] = "저녁"
        elif any(keyword in user_message for keyword in ["밤", "늦은 시간", "야식"]):
            result["time"] = "밤"

        # 목적 추출
        if any(keyword in user_message for keyword in ["술", "술집", "한잔", "2차", "포차"]):
            result["purpose"] = "술자리"
        elif any(keyword in user_message for keyword in ["밥", "식사", "먹을 곳", "점심", "저녁"]):
            result["purpose"] = "식사"
        elif any(keyword in user_message for keyword in ["카페", "커피", "디저트"]):
            result["purpose"] = "카페"
        elif any(keyword in user_message for keyword in ["소개팅", "데이트"]):
            result["purpose"] = "데이트"
        elif any(keyword in user_message for keyword in ["회식", "모임"]):
            result["purpose"] = "모임"

        # 분위기 추출
        if any(keyword in user_message for keyword in ["조용", "한적", "차분"]):
            result["mood"] = "조용함"
        elif any(keyword in user_message for keyword in ["시끄럽", "활기", "북적"]):
            result["mood"] = "활기참"
        elif any(keyword in user_message for keyword in ["감성", "예쁜", "분위기 좋은"]):
            result["mood"] = "감성적"

        # 예산 추출
        if any(keyword in user_message for keyword in ["가성비", "저렴", "싸", "부담 없는"]):
            result["budget"] = "저렴"
        elif any(keyword in user_message for keyword in ["적당", "무난"]):
            result["budget"] = "보통"
        elif any(keyword in user_message for keyword in ["고급", "비싸도", "가격 상관없"]):
            result["budget"] = "높음"

        return result

    async def _llm_parse(
        self,
        user_message: str,
        summary: str,
        previous_parsed_state: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = (
            "아래 사용자 발화에서 장소 추천에 필요한 정보를 JSON으로 추출하세요.\n"
            "반드시 JSON만 출력하세요.\n\n"
            "추출 대상 필드:\n"
            "- area: 지역명\n"
            "- people: 인원수 (정수)\n"
            "- time: 시간대\n"
            "- purpose: 목적\n"
            "- mood: 분위기\n"
            "- budget: 예산 수준\n\n"
            "값이 명확하지 않으면 null로 두세요.\n"
            "기존 상태와 충돌하면, 이번 발화에서 새롭게 명확히 말한 값만 갱신하세요.\n\n"
            f"[기존 요약]\n{summary or '없음'}\n\n"
            f"[기존 parsed_state]\n{json.dumps(previous_parsed_state, ensure_ascii=False)}\n\n"
            f"[사용자 발화]\n{user_message}\n\n"
            "예시 출력:\n"
            '{"area": "강남", "people": 3, "time": "저녁", "purpose": "술자리", "mood": "조용함", "budget": null}'
        )

        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.0,
        )

        content = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
            .strip()
        )

        return self._safe_json_loads(content)

    def _merge_results(
        self,
        rule_result: dict[str, Any],
        llm_result: dict[str, Any],
    ) -> dict[str, Any]:
        merged = dict(rule_result)

        for key, value in llm_result.items():
            if value is not None and value != "":
                merged[key] = value

        return merged

    def _safe_json_loads(self, text: str) -> dict[str, Any]:
        """
        모델이 ```json ... ``` 형태로 답한 경우도 방어
        """
        cleaned = text.strip()

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data
            return {}
        except json.JSONDecodeError:
            return {}