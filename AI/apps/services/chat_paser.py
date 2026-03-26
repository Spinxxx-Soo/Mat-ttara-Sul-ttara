"""
유저 발화 파싱 모듈
- 규칙 기반 + LLM 보조 방식
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from apps.schemas.chat import parsed_state_mergeable_keys


class ChatParser:
    """사용자 발화에서 구조화된 상태를 추출하는 파서"""

    def __init__(self, client):
        self.client = client

    async def parse(
        self,
        user_message: str,
        summary: str,
        previous_parsed_state: dict[str, Any],
        target_slot_hint: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        유저 발화 파싱 및 상태 병합
        - 먼저 규칙 기반으로 추출
        - 부족한 값은 LLM으로 보완
        - 이전 상태와 병합
        - 시간값 변환
        """
        # 1) 규칙 기반 + LLM 파싱
        rule_result = self._rule_based_parse(user_message)
        llm_result = await self._llm_parse(
            user_message=user_message,
            summary=summary,
            previous_parsed_state=previous_parsed_state,
        )
        parsed_update = self._merge_results(rule_result, llm_result)
        hint_update = self._infer_short_answer_with_slot_hint(
            user_message=user_message,
            target_slot_hint=target_slot_hint,
            previous_parsed_state=previous_parsed_state,
        )
        parsed_update = self._merge_results(parsed_update, hint_update)

        # 2) 이전 상태와 병합
        merged_state = self.merge_parsed_state(
            previous=previous_parsed_state,
            new=parsed_update,
        )

        # 3) 시간값 변환
        if merged_state.get("time"):
            merged_state["time"] = self.convert_time_to_time_value(
                merged_state["time"]
            )

        return merged_state

    def _infer_short_answer_with_slot_hint(
        self,
        *,
        user_message: str,
        target_slot_hint: Optional[str],
        previous_parsed_state: dict[str, Any],
    ) -> dict[str, Any]:
        """
        짧은 응답(네/아니요/없어)을 직전 질문 슬롯에 매핑합니다.
        LLM이 문맥 해석에 실패해도 같은 슬롯 재질문 루프를 줄이기 위한 보강 로직입니다.
        """
        if not target_slot_hint:
            return {}
        if target_slot_hint not in parsed_state_mergeable_keys():
            return {}

        # time/lat/lng은 짧은 응답만으로 확정하기 어렵기 때문에 제외합니다.
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
            # 무관/미정 응답도 "답변 완료"로 간주하여 재질문 루프를 방지합니다.
            return {target_slot_hint: 0.5}

        return {}

    def _rule_based_parse(self, user_message: str) -> dict[str, Any]:
        result: dict[str, Any] = {
            "area": None,
            "people": None,
            "time": None,
            "purpose": None,
            "mood": None,
            "budget": None,
            "lat": None,
            "lng": None,
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
            "추출 대상 필드 (명확하지 않으면 null):\n"
            "- time, lat, lng\n"
            "- cuisine_korean, cuisine_japanese, cuisine_chinese, cuisine_western, cuisine_bunsik, cuisine_asian_other: 0~1 선호도\n"
            "- vibe_quiet, vibe_lively, vibe_modern, vibe_traditional: 0~1\n"
            "- seat_private, outdoor_ok: 0~1\n"
            "- occasion_date, occasion_business, occasion_family, occasion_solo, occasion_friends: 0~1\n"
            "selectedPlaceIds는 출력하지 마세요 (백엔드 전용).\n"
            "기존 상태와 충돌하면, 이번 발화에서 새롭게 명확히 말한 값만 갱신하세요.\n\n"
            f"[기존 요약]\n{summary or '없음'}\n\n"
            f"[기존 parsed_state]\n{json.dumps(previous_parsed_state, ensure_ascii=False)}\n\n"
            f"[사용자 발화]\n{user_message}\n\n"
            "예시 출력:\n"
            '{"time": "18:00", "lat": null, "lng": null, '
            '"cuisine_korean": 0.8, "occasion_friends": 1.0, "vibe_quiet": 0.7}'
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

    def merge_parsed_state(
        self,
        previous: dict[str, Any],
        new: dict[str, Any],
    ) -> dict[str, Any]:
        """
        새로 파싱된 값만 기존 state에 덮어쓰기
        """
        merged = dict(previous)

        # `ParsedState`와 동일 키만 병합. selectedPlaceIds는 BE 주입 위주라 파서에서 덮어쓰지 않음.
        allowed_keys = parsed_state_mergeable_keys()

        for key, value in new.items():
            if key not in allowed_keys:
                continue
            if value is None or value == "":
                continue
            merged[key] = value

        return merged

    def convert_time_to_time_value(self, time_str: str) -> str:
        """
        시간대 문자열을 시간값으로 변환
        예: "저녁" -> "18:00"
        """
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

        # 이미 시간 형식인 경우 (HH:MM 또는 HH:MM:SS) 그대로 반환
        if ":" in time_str and len(time_str) <= 8:
            return time_str

        # 매핑에서 찾기
        normalized = time_str.strip()
        return time_mapping.get(normalized, time_str)
