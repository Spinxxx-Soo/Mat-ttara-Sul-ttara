"""
챗봇 서비스 레이어
"""
from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict, Annotated

from langgraph.graph import StateGraph, add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatResponseType,
    MemoryStatus,
    PreferenceSummary,
)
from apps.domain.chat.client import OpenAIClient


SUMMARY_TRIGGER_MESSAGE_COUNT = 12
RECENT_MESSAGE_WINDOW = 6


class ChatState(TypedDict):
    """LangGraph 상태"""
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str

class ChatService:
    """챗봇 서비스"""

    def __init__(self):
        self.client = OpenAIClient()

        # 개발용 checkpointer
        # 운영에서는 Redis 기반으로 교체 해야함.
        self.checkpointer = InMemorySaver()

        # 임시 장기 메모리 저장소 -> 추후 랭체인 메모리
        self._long_term_memories: dict[str, PreferenceSummary] = {}

        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(ChatState)
        workflow.add_node("chatbot", self._chatbot_node)
        workflow.set_entry_point("chatbot")
        workflow.set_finish_point("chatbot")
        return workflow.compile(checkpointer=self.checkpointer)

    async def process_message(self, request: ChatMessageRequest) -> ChatMessageResponse:
        """
        사용자 메시지 처리
        """
        thread_id = request.threadId
        user_message = request.message

        state = self._get_thread_state(thread_id)
        has_history = bool(state and state.get("messages"))
        is_session_start = not has_history

        if request.preferenceSummary:
            self._long_term_memories[thread_id] = request.preferenceSummary

        memory_status = MemoryStatus.OK
        if is_session_start and request.contextInjection:
            if request.contextInjection.reason == "MISSING_MEMORY":
                memory_status = MemoryStatus.MISSING

        # 이번 유저 메시지를 state에 먼저 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [HumanMessage(content=user_message)]},
        )

        # 저장된 상태 다시 조회
        state = self._get_thread_state(thread_id)
        full_messages = state.get("messages", []) if state else []
        current_summary = state.get("summary", "") if state else ""

        # 필요 시 summary 갱신
        updated_summary = current_summary
        if self._should_refresh_summary(full_messages):
            updated_summary = await self._summarize_messages(
                messages=full_messages[:-RECENT_MESSAGE_WINDOW],
                existing_summary=current_summary,
                thread_id=thread_id,
            )
            await self.graph.aupdate_state(
                config={"configurable": {"thread_id": thread_id}},
                values={"summary": updated_summary},
            )

        # 모델에 넣을 입력 구성: system + summary + recent messages
        recent_messages = self._get_recent_messages(full_messages, RECENT_MESSAGE_WINDOW)
        model_messages = self._build_messages_for_model(
            thread_id=thread_id,
            summary=updated_summary,
            recent_messages=recent_messages,
        )

        response = await self.client.chat_completion(model_messages)

        chat_response_text = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "응답을 생성할 수 없습니다.")
        )

        # AI 응답 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [AIMessage(content=chat_response_text)]},
        )

        return ChatMessageResponse(
            threadId=thread_id,
            userId=str(request.userId),
            chatResponse=chat_response_text,
            type=ChatResponseType.FOLLOW_UP,
            memoryStatus=memory_status,
            parsedState=None,
        )

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        """
        현재 구조에서는 직접 graph node 로직을 쓰지 않으므로
        최소 형태로 유지.
        """
        return state

    def _get_thread_state(self, thread_id: str) -> Optional[dict]:
        snapshot = self.graph.get_state(
            config={"configurable": {"thread_id": thread_id}}
        )
        if snapshot and snapshot.values:
            return snapshot.values
        return None

    def _should_refresh_summary(self, messages: list[BaseMessage]) -> bool:
        """
        메시지가 일정 수 이상 쌓이면 summary 갱신
        """
        if len(messages) < SUMMARY_TRIGGER_MESSAGE_COUNT:
            return False
        return len(messages) % 4 == 0

    def _get_recent_messages(
        self,
        messages: list[BaseMessage],
        window_size: int,
    ) -> list[BaseMessage]:
        if len(messages) <= window_size:
            return messages
        return messages[-window_size:]

    async def _summarize_messages(
        self,
        messages: list[BaseMessage],
        existing_summary: str,
        thread_id: str,
    ) -> str:
        """
        오래된 대화 내용을 요약해서 summary 갱신
        """
        if not messages:
            return existing_summary

        conversation_text = self._messages_to_text(messages)

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

    def _build_messages_for_model(
        self,
        thread_id: str,
        summary: str,
        recent_messages: list[BaseMessage],
    ) -> list[dict[str, str]]:
        """
        실제 모델에 전달할 메시지 구성
        """
        messages: list[dict[str, str]] = []

        system_prompt = self._build_system_prompt(thread_id)
        messages.append({"role": "system", "content": system_prompt})

        if summary:
            messages.append(
                {
                    "role": "system",
                    "content": f"[이전 대화 요약]\n{summary}",
                }
            )

        messages.extend(self._to_openai_messages(recent_messages))
        return messages

    def _build_system_prompt(self, thread_id: str) -> str:
        base_prompt = (
            "당신은 친절한 장소 추천 챗봇입니다. "
            "사용자의 요청에 대해 한국어로 답변해주세요."
        )

        preference = self._long_term_memories.get(thread_id)
        if not preference:
            return base_prompt

        preference_text = self._format_preference_summary(preference)
        if not preference_text:
            return base_prompt

        return (
            f"{base_prompt}\n\n"
            f"[사용자 선호도 정보]\n"
            f"{preference_text}\n\n"
            f"위 선호도 정보를 참고하여 사용자에게 맞는 장소를 추천해주세요."
        )

    def _format_preference_summary(self, preference: PreferenceSummary) -> str:
        parts = []

        if preference.preferredVibes:
            parts.append(f"선호하는 분위기: {', '.join(preference.preferredVibes)}")

        if preference.avoidedVibes:
            parts.append(f"피하고 싶은 분위기: {', '.join(preference.avoidedVibes)}")

        if preference.preferredCategories:
            parts.append(f"선호하는 카테고리: {', '.join(preference.preferredCategories)}")

        if preference.preferredPriceLevel:
            parts.append(f"선호하는 가격대: {preference.preferredPriceLevel}단계")

        return "\n".join(parts)

    def _to_openai_messages(self, messages: list[BaseMessage]) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                result.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                result.append({"role": "assistant", "content": msg.content})

        return result

    def _messages_to_text(self, messages: list[BaseMessage]) -> str:
        lines: list[str] = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                lines.append(f"사용자: {msg.content}")
            elif isinstance(msg, AIMessage):
                lines.append(f"챗봇: {msg.content}")

        return "\n".join(lines)