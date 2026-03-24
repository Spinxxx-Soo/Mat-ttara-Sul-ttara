from __future__ import annotations

from typing import List

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from apps.domain.chat.client import OpenAIClient


SUMMARY_TRIGGER_MESSAGE_COUNT = 12


class SummaryService:
    """
    summary 로직 분리:
    - summary refresh 여부 판단
    - 메시지 요약 생성
    - 메시지 리스트를 요약용 텍스트로 변환
    """

    def __init__(self, client: OpenAIClient):
        self.client = client

    def should_refresh_summary(self, messages: List[BaseMessage]) -> bool:
        if len(messages) < SUMMARY_TRIGGER_MESSAGE_COUNT:
            return False
        return len(messages) % 4 == 0

    def messages_to_text(self, messages: List[BaseMessage]) -> str:
        lines: list[str] = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                lines.append(f"사용자: {msg.content}")
            elif isinstance(msg, AIMessage):
                lines.append(f"챗봇: {msg.content}")

        return "\n".join(lines)

    async def summarize_messages(
        self,
        *,
        messages: List[BaseMessage],
        existing_summary: str,
        thread_id: str,  # thread_id는 기존 프롬프트 흐름 호환용(현재 로직에서는 직접 사용하지 않음)
    ) -> str:
        if not messages:
            return existing_summary

        conversation_text = self.messages_to_text(messages)

        prompt = (
            "아래는 사용자와 챗봇의 이전 대화 기록입니다.\n"
            "기존 요약이 있다면 그것을 갱신하는 형태로 핵심 정보만 정리하세요.\n"
            "반드시 아래 항목을 우선 보존하세요:\n"
            "1. 사용자의 목적\n"
            "2. 인원, 시간, 지역, 예산\n"
            "3. 선호/비선호 분위기\n"
            "4. 이미 추천했거나 제외한 조건\n"
            "5. 다음 응답에 필요한 맥락\n\n"
            f"[기존 요약]\n{existing_summary or '없음'}\n\n"
            f"[대화 기록]\n{conversation_text}\n\n"
            "업무용 요약처럼 간결하게 한국어로 작성하세요."
        )

        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.1,
        )

        return (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", existing_summary or "")
            .strip()
        )

