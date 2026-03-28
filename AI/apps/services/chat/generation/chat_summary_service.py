from __future__ import annotations

from dataclasses import dataclass
from typing import List

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from apps.services.chat.openai_client import OpenAIClient


@dataclass(frozen=True)
class SummaryPolicy:
    min_messages_before_summary: int = 12
    refresh_every_n_messages: int = 4
    keep_recent_messages: int = 6


class SummaryService:
    """
    summary 로직 분리:
    - summary refresh 여부 판단
    - 요약 대상 메시지 선택
    - 메시지 요약 생성
    - 메시지 리스트를 요약용 텍스트로 변환
    """

    def __init__(self, client: OpenAIClient, policy: SummaryPolicy | None = None):
        self.client = client
        self.policy = policy or SummaryPolicy()

    def should_refresh_summary(self, messages: List[BaseMessage]) -> bool:
        message_count = len(messages)

        if message_count < self.policy.min_messages_before_summary:
            return False

        return message_count % self.policy.refresh_every_n_messages == 0

    def get_messages_to_summarize(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        """
        최근 N개는 그대로 남기고, 그 이전 메시지만 요약 대상으로 반환
        """
        keep_recent = self.policy.keep_recent_messages

        if len(messages) <= keep_recent:
            return []

        return messages[:-keep_recent]

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
        thread_id: str,
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
