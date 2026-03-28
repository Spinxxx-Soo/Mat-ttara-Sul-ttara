"""
챗봇 진입점 — LangGraph 체크포인터 구성 후 ConversationOrchestrator에 턴 처리 위임.
"""
from __future__ import annotations

import logging
import os
from typing import Annotated, NotRequired
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage

from apps.config import (
    redis_be_bridge_connection_url,
    redis_checkpoint_connection_url,
)
from apps.schemas.chat_schemas import ChatMessageRequest, ChatMessageResponse
from apps.services.chat.bridge.redis_reply_publisher import RedisReplyPublisher
from apps.services.chat.generation.chat_followup_question_generator import FollowupQuestionGenerator
from apps.services.chat.generation.chat_summary_service import SummaryService
from apps.services.chat.openai_client import OpenAIClient
from apps.services.chat.orchestration.conversation_orchestrator import ConversationOrchestrator
from apps.services.chat.parsing.conversation_parser import ConversationParser
from apps.services.chat.parsing.recommendation_parser import RecommendationParser
from apps.services.chat.state.chat_conversation_state_store import ConversationStateStore
from apps.schemas.chat_response_factory import ResponseFactory

logger = logging.getLogger(__name__)


def _create_checkpointer():
    """
    LangGraph RedisSaver는 RediSearch 인덱스(checkpoint_write 등)가 필요하다.
    로컬 단순 Redis면 두 번째 턴에서 `No such index` 로 실패할 수 있음.
    그 경우 .env에 LANGGRAPH_CHECKPOINT_IN_MEMORY=1 을 넣어 InMemorySaver 사용.
    """
    if os.getenv("LANGGRAPH_CHECKPOINT_IN_MEMORY", "").strip().lower() in ("1", "true", "yes"):
        logger.info("LANGGRAPH_CHECKPOINT_IN_MEMORY — InMemorySaver 사용")
        return InMemorySaver()

    redis_url = redis_checkpoint_connection_url()
    if not redis_url:
        return InMemorySaver()
    try:
        from langgraph.checkpoint.redis import RedisSaver

        raw = RedisSaver.from_conn_string(redis_url)
        if hasattr(raw, "setup"):
            raw.setup()
        if hasattr(raw, "__enter__"):
            checkpointer = raw.__enter__()
        else:
            checkpointer = raw
        logger.info(
            "Redis checkpointer initialized: %s",
            redis_url.split("@")[-1] if "@" in redis_url else redis_url,
        )
        return checkpointer
    except Exception as e:
        logger.warning("Redis connection failed, falling back to InMemorySaver: %s", e)
        return InMemorySaver()


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    parsed_state: dict
    preference_state: NotRequired[dict]


class ChatService:
    def __init__(self) -> None:
        self.client = OpenAIClient()
        self.checkpointer = _create_checkpointer()
        self.graph = self._build_graph()
        self.state_store = ConversationStateStore(self.graph, as_node="chatbot")

        recommendation_parser = RecommendationParser(self.client)
        conversation_parser = ConversationParser()
        followup = FollowupQuestionGenerator(client=self.client)
        summary_service = SummaryService(client=self.client)

        self._orchestrator = ConversationOrchestrator(
            client=self.client,
            state_store=self.state_store,
            recommendation_parser=recommendation_parser,
            conversation_parser=conversation_parser,
            followup_question_generator=followup,
            summary_service=summary_service,
            response_factory=ResponseFactory(),
            redis_reply_publisher=RedisReplyPublisher(redis_be_bridge_connection_url()),
        )

    def _build_graph(self):
        workflow = StateGraph(ChatState)
        workflow.add_node("chatbot", self._chatbot_node)
        workflow.set_entry_point("chatbot")
        workflow.set_finish_point("chatbot")
        return workflow.compile(checkpointer=self.checkpointer)

    async def process_message(self, request: ChatMessageRequest) -> ChatMessageResponse:
        return await self._orchestrator.process_message(request)

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        return state
