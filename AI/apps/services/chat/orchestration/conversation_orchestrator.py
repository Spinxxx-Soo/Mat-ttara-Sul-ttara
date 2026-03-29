"""
A. Conversation Orchestrator

한 턴의 순서만 담당: 상태 로드 → 파서(추천/대화) → 요약·제목 → 플래너+NLG로 응답 타입 결정 → 저장·Redis.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

from langchain_core.messages import BaseMessage

from apps.schemas.chat_response_factory import ResponseFactory
from apps.schemas.chat_schemas import ChatMessageRequest, ChatMessageResponse, MemoryStatus
from apps.services.chat.bridge.redis_reply_publisher import (
    RedisReplyPublisher,
    build_be_ai_reply_redis_payload,
)
from apps.services.chat.generation.chat_followup_question_generator import FollowupQuestionGenerator
from apps.services.chat.generation.chat_summary_service import SummaryService
from apps.services.chat.state.chat_bridge_context import BridgeContext
from apps.services.chat.state.chat_conversation_state_store import ConversationStateStore
from apps.services.chat.state.chat_parsed_state_manager import ParsedStateManager
from apps.services.chat.openai_client import OpenAIClient
from apps.services.chat.parsing.conversation_parser import ConversationParser, DialogueTurnResult
from apps.services.chat.parsing.recommendation_parser import RecommendationParser
from apps.services.chat.planning.facets import Facet, representative_slot_for_facet
from apps.services.chat.planning.next_question_planner import pick_next_facet
from apps.services.chat.planning.response_nlg import ResponseNLG
from apps.services.chat.planning.response_planner import (
    plan_follow_up_for_facet,
    plan_location_follow_up,
    plan_place_candidates,
)

RECENT_MESSAGE_WINDOW = 6
logger = logging.getLogger(__name__)

QUESTION_SLOT_PRIORITY: list[str] = [
    "time",
    "cuisine_korean",
    "cuisine_japanese",
    "cuisine_chinese",
    "cuisine_western",
    "cuisine_bunsik",
    "cuisine_asian_other",
    "vibe_quiet",
    "vibe_lively",
    "vibe_modern",
    "vibe_traditional",
    "seat_private",
    "outdoor_ok",
    "occasion_date",
    "occasion_business",
    "occasion_family",
    "occasion_solo",
    "occasion_friends",
]


@dataclass
class _RequestContext:
    thread_id: str
    user_id: int
    user_message: str
    memory_status: MemoryStatus
    need_title: bool


@dataclass
class _LoadedState:
    full_messages: list[BaseMessage]
    current_summary: str
    previous_parsed_state: dict[str, Any]
    previous_preference_state: dict[str, Any]
    previous_normalized_parsed_state: dict[str, Any]
    previous_missing_slots: list[str]
    target_slot_hint: Optional[str]


@dataclass
class _TurnArtifacts:
    merged_parsed_state: dict[str, Any]
    normalized_parsed_state: dict[str, Any]
    dialogue: DialogueTurnResult


@dataclass
class _ResponseMeta:
    summary: str
    title: Optional[str]


class ConversationOrchestrator:
    """추천 대화의 턴 단위 오케스트레이션."""

    def __init__(
        self,
        *,
        client: OpenAIClient,
        state_store: ConversationStateStore,
        recommendation_parser: RecommendationParser,
        conversation_parser: ConversationParser,
        followup_question_generator: FollowupQuestionGenerator,
        summary_service: SummaryService,
        response_factory: ResponseFactory,
        redis_reply_publisher: RedisReplyPublisher,
    ) -> None:
        self.client = client
        self.state_store = state_store
        self.parsed_state_manager = ParsedStateManager(priority_order=QUESTION_SLOT_PRIORITY)
        self.recommendation_parser = recommendation_parser
        self.conversation_parser = conversation_parser
        self.summary_service = summary_service
        self.response_factory = response_factory
        self.redis_reply_publisher = redis_reply_publisher
        self._nlg = ResponseNLG(followup_question_generator)

    async def process_message(self, request: ChatMessageRequest) -> ChatMessageResponse:
        ctx = self._build_request_context(request)
        logger.info(
            "[bridge-context] %s",
            BridgeContext.from_request(request).to_log_dict(),
        )

        await self.state_store.save_user_message(ctx.thread_id, ctx.user_message)

        loaded = self._load_state_after_user_message(request)
        artifacts = await self._parse_and_save_state(
            thread_id=ctx.thread_id,
            user_id=ctx.user_id,
            user_message=ctx.user_message,
            current_summary=loaded.current_summary,
            previous_parsed_state=loaded.previous_parsed_state,
            previous_preference_state=loaded.previous_preference_state,
            target_slot_hint=loaded.target_slot_hint,
        )

        response_meta = await self._prepare_response_meta(
            thread_id=ctx.thread_id,
            user_message=ctx.user_message,
            need_title=ctx.need_title,
            full_messages=loaded.full_messages,
            current_summary=loaded.current_summary,
        )

        self._log_chat_state(
            thread_id=ctx.thread_id,
            user_id=ctx.user_id,
            need_title=ctx.need_title,
            title=response_meta.title,
            normalized_parsed_state=artifacts.normalized_parsed_state,
        )

        response = await self._build_response(
            thread_id=ctx.thread_id,
            user_id=ctx.user_id,
            user_message=ctx.user_message,
            memory_status=ctx.memory_status,
            normalized_parsed_state=artifacts.normalized_parsed_state,
            title=response_meta.title,
            dialogue=artifacts.dialogue,
        )

        await self._persist_and_publish_response(
            thread_id=ctx.thread_id,
            user_id=ctx.user_id,
            response=response,
        )

        return response

    def _build_request_context(self, request: ChatMessageRequest) -> _RequestContext:
        thread_id = request.threadId
        user_message = request.message

        state = self.state_store.get_thread_state(thread_id)
        has_history = bool(state and state.get("messages"))
        is_session_start = not has_history

        memory_status = MemoryStatus.OK
        if (
            is_session_start
            and request.contextInjection
            and request.contextInjection.reason == "MISSING_MEMORY"
        ):
            memory_status = MemoryStatus.MISSING

        return _RequestContext(
            thread_id=thread_id,
            user_id=request.userId,
            user_message=user_message,
            memory_status=memory_status,
            need_title=request.needTitle,
        )

    def _load_state_after_user_message(self, request: ChatMessageRequest) -> _LoadedState:
        state = self.state_store.get_thread_state(request.threadId)

        full_messages = state.get("messages", []) if state else []
        current_summary = state.get("summary", "") if state else ""
        previous_parsed_state = state.get("parsed_state", {}) if state else {}
        previous_preference_state = state.get("preference_state", {}) if state else {}
        if not isinstance(previous_preference_state, dict):
            previous_preference_state = {}

        previous_parsed_state = self.parsed_state_manager.merge_session_state(
            previous_parsed_state=previous_parsed_state,
            session_state=request.sessionState,
        )

        previous_normalized_parsed_state = self.parsed_state_manager.normalize_parsed_state(
            previous_parsed_state
        )
        previous_missing_slots = self.parsed_state_manager.detect_missing_slots(
            previous_normalized_parsed_state
        )

        prev_facet = pick_next_facet(previous_normalized_parsed_state, dialogue=None)
        target_slot_hint = representative_slot_for_facet(
            prev_facet,
            previous_normalized_parsed_state,
        )

        return _LoadedState(
            full_messages=full_messages,
            current_summary=current_summary,
            previous_parsed_state=previous_parsed_state,
            previous_preference_state=previous_preference_state,
            previous_normalized_parsed_state=previous_normalized_parsed_state,
            previous_missing_slots=previous_missing_slots,
            target_slot_hint=target_slot_hint,
        )

    async def _parse_and_save_state(
        self,
        *,
        thread_id: str,
        user_id: int,
        user_message: str,
        current_summary: str,
        previous_parsed_state: dict[str, Any],
        previous_preference_state: dict[str, Any],
        target_slot_hint: Optional[str],
    ) -> _TurnArtifacts:
        rec = await self.recommendation_parser.parse_turn(
            user_message=user_message,
            summary=current_summary,
            previous_parsed_state=previous_parsed_state,
            previous_preference_state=previous_preference_state,
            thread_id=thread_id,
            user_id=user_id,
        )
        dialogue = self.conversation_parser.parse_turn(
            user_message=user_message,
            target_slot_hint=target_slot_hint,
            previous_parsed_state=previous_parsed_state,
        )
        merged_parsed_state = self.recommendation_parser.merge_parsed_state(
            rec.merged_parsed_state,
            dialogue.parsed_delta,
        )

        await self.state_store.save_parsed_state(
            thread_id,
            merged_parsed_state,
            rec.merged_preference_state,
        )

        normalized_parsed_state = self.parsed_state_manager.normalize_parsed_state(merged_parsed_state)

        return _TurnArtifacts(
            merged_parsed_state=merged_parsed_state,
            normalized_parsed_state=normalized_parsed_state,
            dialogue=dialogue,
        )

    async def _prepare_response_meta(
        self,
        *,
        thread_id: str,
        user_message: str,
        need_title: bool,
        full_messages: list[BaseMessage],
        current_summary: str,
    ) -> _ResponseMeta:
        updated_summary = current_summary
        if self.summary_service.should_refresh_summary(full_messages):
            updated_summary = await self.summary_service.summarize_messages(
                messages=full_messages[:-RECENT_MESSAGE_WINDOW],
                existing_summary=current_summary,
                thread_id=thread_id,
            )
            await self.state_store.save_summary(thread_id, updated_summary)

        title: Optional[str] = None
        if need_title:
            title = await self._generate_title(
                user_message=user_message,
                summary=updated_summary,
            )

        return _ResponseMeta(summary=updated_summary, title=title)

    def _log_chat_state(
        self,
        *,
        thread_id: str,
        user_id: int,
        need_title: bool,
        title: Optional[str],
        normalized_parsed_state: dict[str, Any],
    ) -> None:
        logger.info(
            "[ai:chat] thread=%s user=%s needTitle=%s title=%s lat=%s lng=%s time=%s",
            thread_id,
            user_id,
            need_title,
            title,
            normalized_parsed_state.get("lat"),
            normalized_parsed_state.get("lng"),
            normalized_parsed_state.get("time"),
        )

    async def _build_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        user_message: str,
        memory_status: MemoryStatus,
        normalized_parsed_state: dict[str, Any],
        title: Optional[str],
        dialogue: DialogueTurnResult,
    ) -> ChatMessageResponse:
        next_facet = pick_next_facet(normalized_parsed_state, dialogue)

        logger.info(
            "[ai:chat] next_facet=%s (slot-missing-debug=%s)",
            getattr(next_facet, "value", next_facet),
            self.parsed_state_manager.detect_missing_slots(normalized_parsed_state),
        )

        if next_facet is None:
            return await self._build_recommendation_or_location_response(
                thread_id=thread_id,
                user_id=user_id,
                user_message=user_message,
                memory_status=memory_status,
                normalized_parsed_state=normalized_parsed_state,
                title=title,
            )

        return await self._build_follow_up_response(
            thread_id=thread_id,
            user_id=user_id,
            user_message=user_message,
            memory_status=memory_status,
            normalized_parsed_state=normalized_parsed_state,
            title=title,
            next_facet=next_facet,
        )

    async def _build_recommendation_or_location_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        user_message: str,
        memory_status: MemoryStatus,
        normalized_parsed_state: dict[str, Any],
        title: Optional[str],
    ) -> ChatMessageResponse:
        if (
            normalized_parsed_state.get("lat") is None
            or normalized_parsed_state.get("lng") is None
        ):
            plan = plan_location_follow_up()
            logger.info(
                "[followup-plan] facet=%s %s target=%s",
                plan.primary_facet.value,
                plan.planner_note,
                plan.primary_target_slot,
            )
            question = await self._nlg.render_follow_up(
                plan=plan,
                user_message=user_message,
                parsed_state=normalized_parsed_state,
                thread_id=thread_id,
            )
            logger.info("[followup-question] text=%s", question)
            return self.response_factory.create_follow_up_response(
                thread_id=thread_id,
                user_id=user_id,
                chat_response_text=question,
                normalized_parsed_state=normalized_parsed_state,
                memory_status=memory_status,
                title=title,
            )

        logger.info(
            "[ai:chat] switching to PLACE_CANDIDATES lat=%s lng=%s",
            normalized_parsed_state.get("lat"),
            normalized_parsed_state.get("lng"),
        )
        _ = plan_place_candidates()
        return self.response_factory.create_place_candidates_response(
            thread_id=thread_id,
            user_id=user_id,
            normalized_parsed_state=normalized_parsed_state,
            memory_status=memory_status,
            chat_response_text="모이시는 장소가 이곳이 맞을까요? 맞다면 근처 후보 장소를 바로 찾아드릴게요.",
            title=title,
        )

    async def _build_follow_up_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        user_message: str,
        memory_status: MemoryStatus,
        normalized_parsed_state: dict[str, Any],
        title: Optional[str],
        next_facet: Facet,
    ) -> ChatMessageResponse:
        slot = representative_slot_for_facet(next_facet, normalized_parsed_state) or "cuisine_korean"
        plan = plan_follow_up_for_facet(
            facet=next_facet,
            primary_target_slot=slot,
            note=f"next_facet={next_facet.value}",
        )
        logger.info(
            "[followup-plan] facet=%s strategy=%s slot=%s %s",
            next_facet.value,
            plan.strategy,
            plan.primary_target_slot,
            plan.planner_note,
        )

        question = await self._nlg.render_follow_up(
            plan=plan,
            user_message=user_message,
            parsed_state=normalized_parsed_state,
            thread_id=thread_id,
        )
        logger.info("[followup-question] text=%s", question)

        return self.response_factory.create_follow_up_response(
            thread_id=thread_id,
            user_id=user_id,
            chat_response_text=question,
            normalized_parsed_state=normalized_parsed_state,
            memory_status=memory_status,
            title=title,
        )

    async def _persist_and_publish_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        response: ChatMessageResponse,
    ) -> None:
        logger.info(
            "[ai:chat] response_type=%s chatResponse_preview=%s",
            getattr(response, "type", None),
            (response.chatResponse or "")[:80],
        )

        await self.state_store.save_ai_message(thread_id, response.chatResponse)

        self.redis_reply_publisher.publish_chat_reply(
            build_be_ai_reply_redis_payload(
                thread_id=thread_id,
                user_id=user_id,
                response=response,
            )
        )

    async def _generate_title(self, *, user_message: str, summary: str) -> Optional[str]:
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

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]
        try:
            data = json.loads(content)
            t = data.get("title")
            if isinstance(t, str) and t.strip():
                return t.strip()
        except Exception:
            return None

        return None
