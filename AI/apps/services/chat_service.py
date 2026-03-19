"""
챗봇 서비스 레이어
"""
from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict, Annotated

from langgraph.graph import StateGraph, add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage

from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    MemoryStatus,
    PreferenceSummary,
)
from apps.domain.chat.client import OpenAIClient
from apps.services.paser import ChatParser
from apps.services import (
    ParsedStateManager,
    FollowupQuestionGenerator,
    ConversationStateStore,
    SummaryService,
    ResponseFactory,
)


RECENT_MESSAGE_WINDOW = 6


class ParsedState(TypedDict, total=False):
    lat: Optional[float]
    lng: Optional[float]
    people: Optional[int]
    time: Optional[str]
    purpose: Optional[str]
    mood: Optional[str]


# 백엔드에서 제어하는 follow-up 질문 우선순위
# 요구사항의 area > purpose > time > people > mood 중, 현재 프로젝트 `parsedState` source-of-truth에는 `area`가 포함되어 있지 않아 제외했습니다.
QUESTION_SLOT_PRIORITY: list[str] = ["purpose", "time", "people", "mood"]


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

        # 책임 분리 컴포넌트(Orchestration 전용)
        self.state_store = ConversationStateStore(self.graph, as_node="chatbot")
        self.parsed_state_manager = ParsedStateManager(priority_order=QUESTION_SLOT_PRIORITY)
        self.followup_question_generator = FollowupQuestionGenerator(client=self.client)
        self.summary_service = SummaryService(client=self.client)
        self.response_factory = ResponseFactory()

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

        state = self.state_store.get_thread_state(thread_id)
        has_history = bool(state and state.get("messages"))
        is_session_start = not has_history

        if request.preferenceSummary:
            self._long_term_memories[thread_id] = request.preferenceSummary

        memory_status = MemoryStatus.OK
        if is_session_start and request.contextInjection and request.contextInjection.reason == "MISSING_MEMORY":
            memory_status = MemoryStatus.MISSING

        # 1) 유저 메시지 저장
        await self.state_store.save_user_message(thread_id, user_message)

        # 2) 최신 state 다시 조회
        state = self.state_store.get_thread_state(thread_id)
        full_messages = state.get("messages", []) if state else []
        current_summary = state.get("summary", "") if state else ""
        previous_parsed_state = state.get("parsed_state", {}) if state else {}

        # 2-1) sessionState가 있으면 parsedState에 병합 (초기값으로 사용)
        previous_parsed_state = self.parsed_state_manager.merge_session_state(
            previous_parsed_state=previous_parsed_state,
            session_state=request.sessionState,
        )

        # 3) 유저 발화 파싱 (파서에 위임)
        merged_parsed_state = await self.parser.parse(
            user_message=user_message,
            summary=current_summary,
            previous_parsed_state=previous_parsed_state,
        )

        await self.state_store.save_parsed_state(thread_id, merged_parsed_state)

        normalized_parsed_state: ParsedState = self.parsed_state_manager.normalize_parsed_state(
            merged_parsed_state
        )

        # 4) 필요 시 summary 갱신
        updated_summary = current_summary
        if self.summary_service.should_refresh_summary(full_messages):
            updated_summary = await self.summary_service.summarize_messages(
                messages=full_messages[:-RECENT_MESSAGE_WINDOW],
                existing_summary=current_summary,
                thread_id=thread_id,
            )
            await self.state_store.save_summary(thread_id, updated_summary)

        # 5) missing slot 탐지 -> targetSlot 선택 -> follow-up 질문 생성 (백엔드가 분기 제어)
        missing_slots = self.parsed_state_manager.detect_missing_slots(normalized_parsed_state)

        if not missing_slots:
            response = self.response_factory.create_recommendation_response(
                thread_id=thread_id,
                user_id=request.userId,
                normalized_parsed_state=normalized_parsed_state,
                memory_status=memory_status,
            )
        else:
            target_slot = self.parsed_state_manager.select_target_slot(missing_slots)
            question = await self.followup_question_generator.generate_question(
                user_message=user_message,
                parsed_state=normalized_parsed_state,
                target_slot=target_slot,
                thread_id=thread_id,
            )

            response = self.response_factory.create_follow_up_response(
                thread_id=thread_id,
                user_id=request.userId,
                chat_response_text=question,
                target_slot=target_slot,
                normalized_parsed_state=normalized_parsed_state,
                memory_status=memory_status,
            )

        # 6) AI 응답 저장
        await self.state_store.save_ai_message(thread_id, response.chatResponse)

        return response

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        """
        현재 구조에서는 직접 graph node 로직을 쓰지 않으므로 최소 형태 유지
        """
        return state