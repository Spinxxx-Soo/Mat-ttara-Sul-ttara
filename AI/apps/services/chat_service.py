"""
챗봇 서비스 레이어
"""
from __future__ import annotations

from typing import Optional, Any
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
    ParsedState as ParsedStateSchema,
)
from apps.domain.chat.client import OpenAIClient
from apps.services.paser import ChatParser


SUMMARY_TRIGGER_MESSAGE_COUNT = 12
RECENT_MESSAGE_WINDOW = 6


class ParsedState(TypedDict, total=False):
    lat: Optional[float]
    lng: Optional[float]
    people: Optional[int]
    time: Optional[str]
    purpose: Optional[str]
    mood: Optional[str]


class ChatState(TypedDict):
    """LangGraph 상태"""
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    parsed_state: ParsedState


class ChatService:
    """챗봇 서비스"""

    def __init__(self):
        self.client = OpenAIClient()
        self.parser = ChatParser(client=self.client)

        # 개발용 checkpointer
        # 운영에서는 Redis 기반으로 교체
        self.checkpointer = InMemorySaver()

        # 임시 장기 메모리 저장소
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

        # 1) 유저 메시지 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [HumanMessage(content=user_message)]},
            as_node="chatbot",
        )

        # 2) 최신 state 다시 조회
        state = self._get_thread_state(thread_id)
        full_messages = state.get("messages", []) if state else []
        current_summary = state.get("summary", "") if state else ""
        previous_parsed_state = state.get("parsed_state", {}) if state else {}

        # 2-1) sessionState가 있으면 parsedState에 병합 (초기값으로 사용)
        if request.sessionState:
            # sessionState에서 필요한 필드만 추출 (lat, lng, people, time, purpose, mood)
            session_state_dict = request.sessionState.model_dump(
                exclude={"excludedPlaceIds"},
                include={"lat", "lng", "people", "time", "purpose", "mood"}
            )
            # None이 아닌 값만 병합
            for key, value in session_state_dict.items():
                if value is not None:
                    previous_parsed_state[key] = value

        # 3) 유저 발화 파싱
        parsed_update = await self.parser.parse(
            user_message=user_message,
            summary=current_summary,
            previous_parsed_state=previous_parsed_state,
        )

        merged_parsed_state = self._merge_parsed_state(
            previous=previous_parsed_state,
            new=parsed_update,
        )

        # 3-1) time을 시간값으로 변환
        if merged_parsed_state.get("time"):
            merged_parsed_state["time"] = self._convert_time_to_time_value(
                merged_parsed_state["time"]
            )

        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"parsed_state": merged_parsed_state},
            as_node="chatbot",
        )

        # 4) 필요 시 summary 갱신
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
                as_node="chatbot",
            )

        # 5) 모델에 넣을 입력 구성
        recent_messages = self._get_recent_messages(full_messages, RECENT_MESSAGE_WINDOW)
        model_messages = self._build_messages_for_model(
            thread_id=thread_id,
            summary=updated_summary,
            parsed_state=merged_parsed_state,
            recent_messages=recent_messages,
        )

        response = await self.client.chat_completion(model_messages)

        chat_response_text = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "응답을 생성할 수 없습니다.")
        )

        # 6) AI 응답 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [AIMessage(content=chat_response_text)]},
            as_node="chatbot",
        )

        # 7) parsedState를 스키마 형식으로 변환
        parsed_state_schema = ParsedStateSchema(**merged_parsed_state) if merged_parsed_state else None

        return ChatMessageResponse(
            threadId=thread_id,
            userId=request.userId,
            chatResponse=chat_response_text,
            type=ChatResponseType.FOLLOW_UP,
            memoryStatus=memory_status,
            parsedState=parsed_state_schema,
        )

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        """
        현재 구조에서는 직접 graph node 로직을 쓰지 않으므로 최소 형태 유지
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
        parsed_state: ParsedState,
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

        parsed_state_text = self._format_parsed_state(parsed_state)
        if parsed_state_text:
            messages.append(
                {
                    "role": "system",
                    "content": f"[현재 추출된 사용자 요청 정보]\n{parsed_state_text}",
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

    def _format_parsed_state(self, parsed_state: ParsedState) -> str:
        parts = []

        if parsed_state.get("people") is not None:
            parts.append(f"인원: {parsed_state['people']}명")
        if parsed_state.get("time"):
            parts.append(f"시간대: {parsed_state['time']}")
        if parsed_state.get("purpose"):
            parts.append(f"목적: {parsed_state['purpose']}")
        if parsed_state.get("mood"):
            parts.append(f"분위기: {parsed_state['mood']}")
        if parsed_state.get("lat") is not None and parsed_state.get("lng") is not None:
            parts.append(f"위치: ({parsed_state['lat']}, {parsed_state['lng']})")

        return "\n".join(parts)

    def _convert_time_to_time_value(self, time_str: str) -> str:
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

    def _merge_parsed_state(
        self,
        previous: ParsedState,
        new: dict[str, Any],
    ) -> ParsedState:
        """
        새로 파싱된 값만 기존 state에 덮어쓰기
        """
        merged: ParsedState = dict(previous)

        # 반환 JSON에 포함되는 필드만 병합 (area, budget 제외)
        allowed_keys = {"lat", "lng", "people", "time", "purpose", "mood"}
        
        for key, value in new.items():
            if key in allowed_keys and value is not None and value != "":
                merged[key] = value

        return merged

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