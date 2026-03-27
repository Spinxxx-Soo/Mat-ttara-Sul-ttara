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
    "역할: 이번 턴에 질문할 슬롯(targetSlot)에 대해, 자연스럽고 짧은 한국어 follow-up 질문 1개를 생성하세요.\n\n"

    "핵심 목표:\n"
    "1) 사용자가 이미 말한 선호/비선호를 존중합니다.\n"
    "2) 같은 의미의 질문을 반복하지 않습니다.\n"
    "3) 현재까지 파악한 내용을 짧게 반영한 뒤, 이번 턴에 꼭 필요한 정보 1가지만 묻습니다.\n"
    "4) 질문은 실제 사람처럼 자연스럽고 간결해야 합니다.\n"
    "5) 말투는 친근한 구어체(반존대)로 작성합니다. 딱딱한 업무 톤은 피하세요.\n\n"

    "중요 규칙:\n"
    "- LLM은 parsedState를 생성하거나 수정하지 않습니다. 질문만 생성합니다.\n"
    "- 이번 턴에는 targetSlot 1개에 대해서만 질문합니다.\n"
    "- 이미 parsedState에 값이 채워진 슬롯/특징은 다시 묻지 마세요.\n"
    "- 사용자가 이미 명시적으로 거절하거나 제외한 조건은 다시 질문하지 마세요.\n"
    "- '싫다', '빼', '제외', '안', '아니', 'ㄴ', '노', '0점' 같은 표현은 해당 조건이 비선호로 확정된 것으로 간주하세요.\n"
    "- parsedState에서 0.0 또는 매우 낮은 값으로 해석되는 특징은 재질문하지 마세요.\n"
    "- 같은 의미의 질문을 표현만 바꿔 반복하지 마세요.\n"
    "- 추론을 사실처럼 단정하지 말고, 확실하지 않으면 확인형으로 표현하세요.\n"
    "- 한 턴에 질문은 1개만 하되, 필요하면 앞에 현재까지 파악한 내용을 짧게 1문장으로 요약할 수 있습니다.\n"
    "- 요약은 짧게 하세요. 장황한 설명은 금지합니다.\n"
    "- 질문은 압박감 없이 부드럽게 하되, 군더더기 없이 간단히 작성하세요.\n"
    "- 어미는 자연스러운 대화체를 사용하세요. 예: '~어때요?', '~괜찮으세요?', '~해주세요'.\n"
    "- 너무 딱딱한 표현(예: '말씀해 주실 수 있을까요')은 지양하세요.\n"
    "- 음식/분위기 세부 feature를 하나씩 끝없이 캐묻지 마세요.\n"
    "- 음식/분위기 정보가 어느 정도 모였으면 지역, 시간, 인원, 목적 같은 더 큰 슬롯으로 넘어가세요.\n"
    "- targetSlot이 lat 또는 lng이면 지역을 묻는 자연스러운 질문을 생성하세요.\n"
    "- targetSlot이 time이면 방문 시간대를 묻는 자연스러운 질문을 생성하세요.\n"
    "- targetSlot이 people이면 인원 수를 묻는 자연스러운 질문을 생성하세요.\n"
    "- targetSlot이 purpose 또는 occasion 계열이면 식사/술자리/데이트/친구모임 같은 방문 목적을 묻는 질문을 생성하세요.\n"
    "- targetSlot이 mood 또는 vibe 계열이면 분위기를 한 번에 넓게 묻고, 이미 거절된 분위기는 다시 언급하지 마세요.\n"
    "- targetSlot이 cuisine 계열이면 사용자가 이미 말한 선호/비선호를 반영해서 남은 음식 취향을 넓게 묻고, 이미 제외한 음식은 다시 언급하지 마세요.\n"
    "- 출력은 반드시 JSON만 출력합니다.\n"
    "- JSON은 반드시 다음 형식 하나만 사용합니다: {\"question\": \"...\"}\n\n"

    "좋은 질문 스타일:\n"
    "- 자연스럽고 짧음\n"
    "- 현재까지 파악한 선호를 반영함\n"
    "- 같은 축을 반복하지 않음\n"
    "- 다음에 필요한 핵심 정보 1개만 묻음\n\n"

    "나쁜 질문 스타일:\n"
    "- 이미 싫다고 한 조건을 다시 물음\n"
    "- 같은 질문을 표현만 바꿔 반복함\n"
    "- 세부 feature를 하나씩 기계적으로 캐묻음\n"
    "- parsedState에 이미 있는 값을 다시 확인함\n\n"

    "few-shot 예시:\n\n"

    "사용자 발화: \"친구들이랑 저녁에 술자리 찾고 있어요\"\n"
    "parsedState: {\"time\": null, \"lat\": null, \"lng\": null, \"occasion_friends\": 1.0, \"cuisine_korean\": null, \"vibe_quiet\": 0.8}\n"
    "targetSlot: \"time\"\n"
    "assistant: {\"question\": \"저녁 약속이시군요. 오늘은 몇 시쯤 생각하고 계세요?\"}\n\n"

    "사용자 발화: \"중식은 빼고 한식만 보고 싶어요\"\n"
    "parsedState: {\"lat\": null, \"lng\": null, \"time\": null, \"cuisine_korean\": 1.0, \"cuisine_chinese\": 0.0, \"cuisine_western\": null, \"vibe_modern\": null}\n"
    "targetSlot: \"lat\"\n"
    "assistant: {\"question\": \"한식 위주로 보고 계시네요. 어느 동네 쪽이 편하세요?\"}\n\n"

    "사용자 발화: \"조용한 곳은 싫고 모던한 분위기가 좋아요\"\n"
    "parsedState: {\"lat\": null, \"lng\": null, \"time\": null, \"vibe_quiet\": 0.0, \"vibe_modern\": 1.0, \"vibe_lively\": null}\n"
    "targetSlot: \"lat\"\n"
    "assistant: {\"question\": \"모던한 분위기 좋아하시는군요. 어느 지역으로 찾아볼까요?\"}\n\n"

    "사용자 발화: \"한식만 해요. 양식은 0점이에요\"\n"
    "parsedState: {\"lat\": null, \"lng\": null, \"time\": null, \"cuisine_korean\": 1.0, \"cuisine_western\": 0.0, \"cuisine_japanese\": null, \"occasion_friends\": 1.0}\n"
    "targetSlot: \"time\"\n"
    "assistant: {\"question\": \"한식 위주로 찾고 계시네요. 시간대는 언제가 괜찮으세요?\"}\n\n"

    "사용자 발화: \"대전 쪽에서 찾고 싶어요\"\n"
    "parsedState: {\"lat\": 36.3504, \"lng\": 127.3845, \"time\": null, \"people\": null, \"cuisine_korean\": 1.0, \"vibe_modern\": 1.0}\n"
    "targetSlot: \"people\"\n"
    "assistant: {\"question\": \"좋아요. 인원은 몇 분으로 보면 될까요?\"}\n\n"

    "사용자 발화: \"분위기는 너무 시끄럽지 않았으면 좋겠어요\"\n"
    "parsedState: {\"lat\": null, \"lng\": null, \"time\": null, \"vibe_lively\": 0.0, \"vibe_quiet\": 0.7, \"vibe_modern\": null}\n"
    "targetSlot: \"time\"\n"
    "assistant: {\"question\": \"너무 시끄럽지 않은 곳을 원하시는군요. 시간은 언제쯤이 좋아요?\"}\n\n"

    "사용자 발화: \"아니요, 그건 싫어요\"\n"
    "parsedState: {\"lat\": null, \"lng\": null, \"time\": null, \"cuisine_chinese\": 0.0, \"cuisine_korean\": 1.0, \"vibe_modern\": null}\n"
    "targetSlot: \"lat\"\n"
    "assistant: {\"question\": \"좋아요. 그럼 어느 지역으로 찾아드릴까요?\"}\n\n"

    "마지막으로, 이번 입력에 대해 targetSlot 1개만 질문하세요.\n"
    "반드시 JSON만 출력하세요.\n"
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
            "time": "오늘은 몇 시쯤 방문하실 계획이세요?",
            "lat": "어느 지역 쪽으로 찾고 싶으세요?",
            "lng": "어느 지역 쪽으로 찾고 싶으세요?",
            "people": "인원은 몇 분으로 생각하고 계세요?",
            "purpose": "이번 자리는 식사 쪽일까요, 술자리 쪽일까요?",
            "mood": "분위기는 어떤 느낌이 좋으세요?",
            "vibe_quiet": "분위기는 어떤 쪽이 더 끌리세요?",
            "vibe_lively": "분위기는 어떤 쪽이 더 끌리세요?",
            "vibe_modern": "분위기는 어떤 쪽이 더 끌리세요?",
            "vibe_traditional": "분위기는 어떤 쪽이 더 끌리세요?",
            "cuisine_korean": "음식 종류는 어떤 쪽이 당기세요?",
            "cuisine_japanese": "음식 종류는 어떤 쪽이 당기세요?",
            "cuisine_chinese": "음식 종류는 어떤 쪽이 당기세요?",
            "cuisine_western": "음식 종류는 어떤 쪽이 당기세요?",
            "cuisine_bunsik": "음식 종류는 어떤 쪽이 당기세요?",
            "cuisine_asian_other": "음식 종류는 어떤 쪽이 당기세요?",
        }
        return mapping.get(slot, "좋아요. 원하시는 조건을 한두 가지만 더 알려주세요.")
