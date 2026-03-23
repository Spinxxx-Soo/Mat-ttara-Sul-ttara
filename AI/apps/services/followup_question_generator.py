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
            "역할: 백엔드가 이미 선택한 targetSlot에 대해, 자연스러운 한국어 follow-up 질문 1개를 생성하세요.\n"
            "중요 규칙:\n"
            "- LLM은 parsedState를 생성/수정하지 않습니다. (질문만 생성)\n"
            "- 이번 턴에는 targetSlot 1개에 대해서만 질문합니다.\n"
            "- 이미 parsedState에 들어있는 값들은 맥락으로만 활용하세요.\n"
            "- 추론을 사실처럼 단정하지 마세요. 확실하지 않으면 확인/질문형으로 표현하세요.\n"
            "- 출력은 반드시 JSON만 출력합니다.\n"
            "- JSON 형태는 아래와 같이 'question' 하나만 포함합니다.\n"
            '{"question": "..."}\n\n'
            "few-shot 예시(모두 targetSlot 1개만 질문합니다):\n\n"
            "사용자 발화: \"친구들이랑 저녁에 술자리 찾고 있어요\"\n"
            "parsedState: {\"people\": 2, \"time\": null, \"purpose\": \"술자리\", \"mood\": \"조용함\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"두 분이 조용한 분위기에서 술자리라면 시간대는 언제가 편하세요?\"}\n\n"
            "사용자 발화: \"점심쯤 가볍게 먹으려는데 인원은 아직 몰라요\"\n"
            "parsedState: {\"people\": null, \"time\": \"12:00\", \"purpose\": \"식사\", \"mood\": \"활기참\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"people\"\n"
            "assistant: {\"question\": \"12:00에 가볍게 식사하신다면 인원은 몇 분이세요?\"}\n\n"
            "사용자 발화: \"강남 근처에서 데이트 장소 알아보고 있어요\"\n"
            "parsedState: {\"people\": 2, \"time\": \"18:00\", \"purpose\": \"데이트\", \"mood\": null, \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"mood\"\n"
            "assistant: {\"question\": \"데이트라면 분위기는 어떤 쪽이 좋으세요? 조용한 편 vs 좀 더 활기 있는 편 중에서요.\"}\n\n"
            "사용자 발화: \"이따 만날 건데 뭐 먹을지 아직 정하진 않았어요\"\n"
            "parsedState: {\"people\": 3, \"time\": \"18:00\", \"purpose\": null, \"mood\": \"감성적\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"purpose\"\n"
            "assistant: {\"question\": \"18:00에 3분이면 어떤 목적이세요? 식사, 술자리, 카페, 데이트, 모임 중에 편하신 쪽으로요.\"}\n\n"
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
            "purpose": "원하시는 목적이 무엇인지 한 번만 더 알려주실 수 있을까요?",
            "time": "시간대는 언제가 편하세요?",
            "people": "인원은 몇 분이세요?",
            "mood": "어떤 분위기를 원하세요?",
        }
        return mapping.get(slot, "어떤 조건이 더 필요할까요?")

