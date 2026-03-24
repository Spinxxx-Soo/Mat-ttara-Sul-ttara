from __future__ import annotations

from typing import Any, Optional

from apps.schemas.chat import (
    ChatMessageResponse,
    ChatResponseType,
    MemoryStatus,
    ParsedState as ParsedStateSchema,
)


ParsedState = dict[str, Any]


class ResponseFactory:
    """
    최종 응답 DTO 조립 분리:
    - FOLLOW_UP 응답 생성
    - RECOMMENDATION 응답 생성
    """

    def create_follow_up_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        chat_response_text: str,
        target_slot: str,
        normalized_parsed_state: ParsedState,
        memory_status: MemoryStatus,
    ) -> ChatMessageResponse:
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)
        return ChatMessageResponse(
            threadId=thread_id,
            userId=user_id,
            chatResponse=chat_response_text,
            type=ChatResponseType.FOLLOW_UP,
            memoryStatus=memory_status,
            targetSlot=target_slot,
            parsedState=parsed_state_schema,
        )

    def create_recommendation_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        normalized_parsed_state: ParsedState,
        memory_status: MemoryStatus,
    ) -> ChatMessageResponse:
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)
        return ChatMessageResponse(
            threadId=thread_id,
            userId=user_id,
            chatResponse="좋아요! 말씀해주신 조건으로 장소를 추천해드릴게요.",
            type=ChatResponseType.RECOMMENDATION,
            memoryStatus=memory_status,
            targetSlot=None,
            parsedState=parsed_state_schema,
        )

