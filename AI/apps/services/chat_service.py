"""
챗봇 서비스 레이어
"""
from __future__ import annotations

import logging
from typing import Any, Optional
from typing_extensions import TypedDict, Annotated

from langgraph.graph import StateGraph, add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage

from apps.config import settings
from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    MemoryStatus,
)
from apps.domain.chat.client import OpenAIClient
from apps.services.chat_paser import ChatParser
from apps.services.redis_reply_publisher import (
    RedisReplyPublisher,
    build_be_ai_reply_redis_payload,
)
from apps.services import (
    ParsedStateManager,
    FollowupQuestionGenerator,
    ConversationStateStore,
    SummaryService,
    ResponseFactory,
)


RECENT_MESSAGE_WINDOW = 6
logger = logging.getLogger(__name__)


def _create_checkpointer():
    """
    Redis URL이 설정되면 RedisSaver 사용 (단기 메모리 + parsed_state 저장),
    아니면 InMemorySaver 사용.
    """
    redis_url = settings.redis_url
    if redis_url:
        try:
            from langgraph.checkpoint.redis import RedisSaver

            checkpointer = RedisSaver.from_conn_string(redis_url)
            checkpointer.setup()
            logger.info("Redis checkpointer initialized: %s", redis_url.split("@")[-1] if "@" in redis_url else redis_url)
            return checkpointer
        except Exception as e:
            logger.warning("Redis connection failed, falling back to InMemorySaver: %s", e)
    return InMemorySaver()


# 백엔드에서 제어하는 follow-up 질문 우선순위 (`ParsedState` 필드명과 일치)
# 응답 스키마에서 people/purpose/mood 제거 후, 추천에 필요한 슬롯을 우선 채웁니다.
QUESTION_SLOT_PRIORITY: list[str] = [
    # 시간/방문 목적
    "time",
    # 음식
    "cuisine_korean",
    "cuisine_japanese",
    "cuisine_chinese",
    "cuisine_western",
    "cuisine_bunsik",
    "cuisine_asian_other",
    # 분위기/좌석/야외
    "vibe_quiet",
    "vibe_lively",
    "vibe_modern",
    "vibe_traditional",
    "seat_private",
    "outdoor_ok",
    # occasion
    "occasion_date",
    "occasion_business",
    "occasion_family",
    "occasion_solo",
    "occasion_friends",
]


class ChatState(TypedDict):
    """LangGraph 상태 — parsed_state는 schemas.ParsedState와 동일 키 구조."""
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    parsed_state: dict[str, Any]


class ChatService:
    """챗봇 서비스"""

    def __init__(self):
        self.client = OpenAIClient()
        self.parser = ChatParser(client=self.client)

        # 단기 메모리(messages, summary) + parsed_state 저장
        # REDIS_URL 설정 시 Redis, 미설정 시 InMemorySaver
        self.checkpointer = _create_checkpointer()

        self.graph = self._build_graph()

        # 책임 분리 컴포넌트(Orchestration 전용)
        self.state_store = ConversationStateStore(self.graph, as_node="chatbot")
        self.parsed_state_manager = ParsedStateManager(priority_order=QUESTION_SLOT_PRIORITY)
        self.followup_question_generator = FollowupQuestionGenerator(client=self.client)
        self.summary_service = SummaryService(client=self.client)
        self.response_factory = ResponseFactory()
        self.redis_reply_publisher = RedisReplyPublisher(settings.redis_url)
        # self.memory_service = MemoryService()  # 장기 메모리 비활성화

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

        # if request.preferenceSummary:
        #     self._long_term_memories[thread_id] = request.preferenceSummary  # 장기 메모리 비활성화

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

        previous_normalized_parsed_state: dict[str, Any] = (
            self.parsed_state_manager.normalize_parsed_state(previous_parsed_state)
        )
        previous_missing_slots = self.parsed_state_manager.detect_missing_slots(
            previous_normalized_parsed_state
        )
        target_slot_hint: Optional[str] = None
        if previous_missing_slots:
            target_slot_hint = self.parsed_state_manager.select_target_slot(
                missing_slots=previous_missing_slots,
                normalized_parsed_state=previous_normalized_parsed_state,
            )

        # 3) 유저 발화 파싱 (파서에 위임)
        merged_parsed_state = await self.parser.parse(
            user_message=user_message,
            summary=current_summary,
            previous_parsed_state=previous_parsed_state,
            target_slot_hint=target_slot_hint,
        )

        await self.state_store.save_parsed_state(thread_id, merged_parsed_state)

        normalized_parsed_state: dict[str, Any] = self.parsed_state_manager.normalize_parsed_state(
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

        # 4-1) 장기 선호(장기 메모리) 업데이트 — MVP 비활성화
        # prev_profile = self._long_term_profiles.get(thread_id, {})
        # updated_profile, _events = self.memory_service.process_user_message_for_long_term_memory(
        #     user_message=user_message,
        #     summary=updated_summary,
        #     previous_profile=prev_profile,
        # )
        # self._long_term_profiles[thread_id] = updated_profile

        # 5) 제목(첫 응답) 생성
        title: Optional[str] = None
        if request.needTitle:
            title = await self._generate_title(
                user_message=user_message,
                summary=updated_summary,
            )

        logger.info(
            "[ai:chat] thread=%s user=%s needTitle=%s title=%s lat=%s lng=%s time=%s",
            thread_id,
            request.userId,
            request.needTitle,
            title,
            normalized_parsed_state.get("lat"),
            normalized_parsed_state.get("lng"),
            normalized_parsed_state.get("time"),
        )

        # 6) missing slot 탐지 -> 슬롯 1개 선택 -> follow-up 질문 생성 (AI 서버 내부 전용)
        missing_slots = self.parsed_state_manager.detect_missing_slots(normalized_parsed_state)
        logger.info("[ai:chat] missing_slots=%s normalized_state_keys=%s", missing_slots, list(normalized_parsed_state.keys()))

        if not missing_slots:
            # PLACE_CANDIDATES 응답은 BE가 lat/lng로 반경 필터링할 수 있어야 합니다.
            if normalized_parsed_state.get("lat") is None or normalized_parsed_state.get("lng") is None:
                question = await self.followup_question_generator.generate_question(
                    user_message=user_message,
                    parsed_state=normalized_parsed_state,
                    target_slot="lat",
                    thread_id=thread_id,
                )
                response = self.response_factory.create_follow_up_response(
                    thread_id=thread_id,
                    user_id=request.userId,
                    chat_response_text=question,
                    normalized_parsed_state=normalized_parsed_state,
                    memory_status=memory_status,
                    title=title,
                )
            else:
                logger.info("[ai:chat] switching to PLACE_CANDIDATES lat=%s lng=%s", normalized_parsed_state.get("lat"), normalized_parsed_state.get("lng"))
                response = self.response_factory.create_place_candidates_response(
                    thread_id=thread_id,
                    user_id=request.userId,
                    normalized_parsed_state=normalized_parsed_state,
                    memory_status=memory_status,
                    chat_response_text="모이시는 장소가 이곳이 맞을까요? 맞다면 근처 후보 장소를 바로 찾아드릴게요.",
                    title=title,
                )
        else:
            target_slot = self.parsed_state_manager.select_target_slot(
                missing_slots=missing_slots,
                normalized_parsed_state=normalized_parsed_state,
            )
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
                normalized_parsed_state=normalized_parsed_state,
                memory_status=memory_status,
                title=title,
            )

        logger.info("[ai:chat] response_type=%s chatResponse_preview=%s", getattr(response, "type", None), (response.chatResponse or "")[:80])

        # 6) AI 응답 저장
        await self.state_store.save_ai_message(thread_id, response.chatResponse)

        # 7) BE Redis Pub/Sub (BE는 ai:reply 구독 — 체크포인터 Redis와 별도 클라이언트)
        self.redis_reply_publisher.publish_chat_reply(
            build_be_ai_reply_redis_payload(
                thread_id=thread_id,
                user_id=request.userId,
                response=response,
            )
        )

        return response

    async def _generate_title(self, *, user_message: str, summary: str) -> Optional[str]:
        """
        BE의 needTitle 플래그에 따라 채팅방 제목을 생성합니다.
        """
        prompt = (
            "아래 대화의 핵심 목적을 20자 이내 한국어 제목으로 만들어 주세요.\n"
            "- 제목은 길게 쓰지 말고, 공백 포함 1문장 이내\n"
            "- 반드시 JSON만 출력\n"
            "예: {\"title\":\"강남역 3인 술자리\"}\n\n"
            f"[대화 요약]\n{summary or '없음'}\n\n"
            f"[사용자 발화]\n{user_message}\n"
        )

        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80,
            temperature=0.3,
        )

        content = (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        # JSON만 남기기 위한 방어
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]
        try:
            import json as _json

            data = _json.loads(content)
            title = data.get("title")
            if isinstance(title, str) and title.strip():
                return title.strip()
        except Exception:
            return None

        return None

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        """
        현재 구조에서는 직접 graph node 로직을 쓰지 않으므로 최소 형태 유지
        """
        return state