from __future__ import annotations

import json
from typing import Any

from apps.domain.chat.client import OpenAIClient

ParsedState = dict[str, Any]


class FollowupQuestionGenerator:
    """
    follow-up 질문 생성 책임 분리:
    - follow-up prompt 생성
    - LLM 호출
    - LLM JSON 응답 파싱
    - fallback 질문 생성
    """

    def __init__(self, client: OpenAIClient):
        self.client = client

    async def generate_question(
        self,
        *,
        user_message: str,
        parsed_state: ParsedState,
        target_slot: str,
        thread_id: str,
    ) -> str:
        messages = self._build_followup_messages(
            user_message=user_message,
            parsed_state=parsed_state,
            target_slot=target_slot,
            thread_id=thread_id,
        )

        llm_response = await self.client.chat_completion(
            messages=messages,
            max_tokens=220,
            temperature=0.3,
        )

        llm_content = (
            llm_response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        return self._extract_question_from_llm_json(
            llm_content,
            fallback_target_slot=target_slot,
        )

    def _build_followup_messages(
        self,
        user_message: str,
        parsed_state: ParsedState,
        target_slot: str,
        thread_id: str,
    ) -> list[dict[str, str]]:
        system_prompt = (
            "당신은 장소 추천 챗봇의 '후속 질문 생성기'입니다.\n"
            "역할: 이번 턴에 질문할 슬롯(targetSlot)에 대해, 자연스러운 한국어 follow-up 질문 1개를 생성하세요.\n"
            "중요 규칙:\n"
            "- LLM은 parsedState를 생성/수정하지 않습니다. (질문만 생성)\n"
            "- 이번 턴에는 targetSlot 1개에 대해서만 질문합니다.\n"
            "- 이미 parsedState에 들어있는 값들은 맥락으로만 활용하세요.\n"
            "- 추론을 사실처럼 단정하지 마세요. 확실하지 않으면 확인/질문형으로 표현하세요.\n"
            "- 출력은 반드시 JSON만 출력합니다.\n"
            "- JSON 형태는 아래와 같이 'question' 하나만 포함합니다.\n"
            '{"question": "..."}\n\n'
            "few-shot 예시(모두 targetSlot 1개만 질문합니다). parsedState는 API 응답과 동일한 키만 사용합니다.\n\n"
            "사용자 발화: \"친구들이랑 저녁에 술자리 찾고 있어요\"\n"
            "parsedState: {\"time\": null, \"lat\": null, \"lng\": null, \"occasion_friends\": 1.0, "
            "\"cuisine_korean\": null, \"vibe_quiet\": 0.8}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"친구분들과 술자리라면 몇 시쯤이 편하세요?\"}\n\n"
            "사용자 발화: \"점심쯤 가볍게 먹을 곳 찾는 중이에요\"\n"
            "parsedState: {\"time\": null, \"lat\": null, \"lng\": null, \"cuisine_japanese\": 0.6}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"점심 무렵이시면 대략 몇 시쯤이 편하세요?\"}\n\n"
            "사용자 발화: \"강남 근처에서 데이트 장소 알아보고 있어요\"\n"
            "parsedState: {\"time\": null, \"lat\": null, \"lng\": null, \"occasion_date\": 1.0, \"vibe_quiet\": null}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"데이트 일정이시면 몇 시쯤 만나시나요?\"}\n\n"
            "사용자 발화: \"이따 만날 건데 뭐 먹을지 아직 정하진 않았어요\"\n"
            "parsedState: {\"time\": null, \"lat\": null, \"lng\": null, \"occasion_friends\": 0.9}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"만나시는 시간대는 대략 언제쯤이세요?\"}\n\n"
            "마지막으로, 이번 입력에 대해 targetSlot 1개만 질문하세요."
        )

        user_prompt = (
            f"threadId: {thread_id}\n"
            f"사용자 발화: {user_message}\n"
            f"parsedState: {json.dumps(parsed_state, ensure_ascii=False)}\n"
            f"targetSlot: {target_slot}\n"
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _safe_json_loads(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        # JSON만 남기기 위한 방어(앞뒤로 텍스트가 섞이는 경우를 대비)
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]

        try:
            data = json.loads(cleaned)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _extract_question_from_llm_json(self, llm_content: str, fallback_target_slot: str) -> str:
        parsed = self._safe_json_loads(llm_content)
        question = parsed.get("question") if isinstance(parsed, dict) else None
        if isinstance(question, str) and question.strip():
            return question.strip()
        return self._fallback_question_for_slot(fallback_target_slot)

    def _fallback_question_for_slot(self, slot: str) -> str:
        mapping = {
            "time": "시간대는 언제가 편하세요?",
            "lat": "어느 쪽 지역이 편하세요?",
            "lng": "어느 쪽 지역이 편하세요?",
        }
        return mapping.get(slot, "어떤 조건이 더 필요할까요?")
