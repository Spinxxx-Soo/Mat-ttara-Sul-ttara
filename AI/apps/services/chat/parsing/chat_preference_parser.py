"""
유저 발화 → preference_state (추상 의미). 수치 벡터는 apps.services.chat.parsing.chat_preference_vector_builder.build_extra_data_llm.
"""
from __future__ import annotations

import json
from typing import Any

from apps.schemas.chat_preference_state import merge_abstract_preference, strip_preference_for_builder


class PreferenceParser:
    def __init__(self, client: Any) -> None:
        self.client = client

    def parse_rules(self, user_message: str) -> dict[str, Any]:
        out: dict[str, Any] = {}

        if any(k in user_message for k in ("조용", "한적", "차분")):
            out["mood"] = "quiet"
        elif any(k in user_message for k in ("시끄럽", "활기", "북적", "시끌")):
            out["mood"] = "lively"
        elif any(k in user_message for k in ("모던", "깔끔", "세련")):
            out["mood"] = "modern"
        elif any(k in user_message for k in ("전통", "한옥", "고풍")):
            out["mood"] = "traditional"

        if any(k in user_message for k in ("친구", "동창", "동기", "모임")):
            out["social"] = "friends"
        elif any(k in user_message for k in ("소개팅", "데이트", "여친", "남친")):
            out["social"] = "date"
        elif any(k in user_message for k in ("회사", "미팅", "비즈", "접대")):
            out["social"] = "business"
        elif any(k in user_message for k in ("가족", "부모", "아이")):
            out["social"] = "family"
        elif any(k in user_message for k in ("혼자", "솔로", "1인")):
            out["social"] = "solo"

        if any(k in user_message for k in ("술", "술집", "한잔", "2차", "포차", "맥주", "소주")):
            out["intent"] = "drink"
        elif any(k in user_message for k in ("카페", "커피", "디저트")):
            out["intent"] = "cafe"
        elif any(k in user_message for k in ("밥", "식사", "먹", "맛집", "저녁", "점심")):
            out["intent"] = "meal"

        if any(k in user_message for k in ("한식", "고기", "삼겹", "찌개", "국밥")):
            out["food"] = "korean"
        elif any(k in user_message for k in ("일식", "스시", "라멘", "이자카야")):
            out["food"] = "japanese"
        elif any(k in user_message for k in ("중식", "짜장", "마라")):
            out["food"] = "chinese"
        elif any(k in user_message for k in ("양식", "파스타", "스테이크")):
            out["food"] = "western"
        elif any(k in user_message for k in ("분식", "떡볶이", "김밥")):
            out["food"] = "bunsik"
        elif any(k in user_message for k in ("태국", "베트남", "아시안")):
            out["food"] = "asian_other"

        if any(k in user_message for k in ("룸", "프라이빗", "개별실")):
            out["space"] = "private"
        elif any(k in user_message for k in ("야외", "테라스", "루프탑")):
            out["space"] = "outdoor"
        elif any(k in user_message for k in ("오픈", "홀", "넓은")):
            out["space"] = "open"

        return out

    async def parse_llm(
        self,
        *,
        user_message: str,
        summary: str,
        previous_abstract: dict[str, Any],
    ) -> dict[str, Any]:
        prev = strip_preference_for_builder(previous_abstract)
        prompt = (
            "아래 사용자 발화에서 '추상 선호'만 JSON으로 추출하세요.\n"
            "반드시 JSON만 출력하세요.\n\n"
            "한 가지(음식·시간·동행 등)만 직접 말해도, 요약·이전 선호와 맞물려 **타당하면** "
            "연관 필드를 추론해 채우세요. (예: '회식' 뉘앙스 → social이나 intent 추론)\n"
            "확신이 없으면 null을 유지합니다.\n\n"
            "허용 필드 (해당 없으면 null):\n"
            '- mood: "quiet"|"lively"|"modern"|"traditional"|null\n'
            '- social: "friends"|"date"|"business"|"family"|"solo"|null\n'
            '- food: "korean"|"japanese"|"chinese"|"western"|"bunsik"|"asian_other"|"any"|null\n'
            '- intent: "meal"|"drink"|"cafe"|null\n'
            '- space: "private"|"open"|"outdoor"|null\n'
            "lat/lng/time/cuisine_korean 같은 수치·좌표 필드는 절대 넣지 마세요.\n\n"
            f"[기존 요약]\n{summary or '없음'}\n\n"
            f"[이전 추상 선호]\n{json.dumps(prev, ensure_ascii=False)}\n\n"
            f"[사용자 발화]\n{user_message}\n"
        )
        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=220,
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

    def merge_rule_and_llm(
        self,
        rule: dict[str, Any],
        llm: dict[str, Any],
    ) -> dict[str, Any]:
        allowed = {"mood", "social", "food", "intent", "space"}
        merged = {}
        for k in allowed:
            v = rule.get(k)
            if v is not None and v != "":
                merged[k] = v
        for k in allowed:
            if k in merged:
                continue
            v = llm.get(k)
            if v is not None and v != "":
                merged[k] = v
        return merged

    async def parse_turn(
        self,
        *,
        user_message: str,
        summary: str,
        previous_preference_state: dict[str, Any],
    ) -> dict[str, Any]:
        rule = self.parse_rules(user_message)
        llm = await self.parse_llm(
            user_message=user_message,
            summary=summary,
            previous_abstract=previous_preference_state,
        )
        delta = self.merge_rule_and_llm(rule, llm)
        return merge_abstract_preference(previous_preference_state, delta)
