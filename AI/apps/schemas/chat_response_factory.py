from __future__ import annotations

from typing import Any

from apps.schemas.chat_schemas import (
    ChatMessageResponse,
    ChatResponseType,
    MemoryStatus,
    ParsedState as ParsedStateSchema,
    PlaceInfo,
)


ParsedState = dict[str, Any]


class ResponseFactory:
    """
    최종 응답 DTO 조립 (chat_schemas 기반):
    - FOLLOW_UP / PLACE_CANDIDATES / RECOMMENDATION 응답 생성
    """

    def create_follow_up_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        chat_response_text: str,
        normalized_parsed_state: ParsedState,
        memory_status: MemoryStatus,
        title: str | None = None,
    ) -> ChatMessageResponse:
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)
        return ChatMessageResponse(
            threadId=thread_id,
            userId=user_id,
            chatResponse=chat_response_text,
            type=ChatResponseType.FOLLOW_UP,
            memoryStatus=memory_status,
            parsedState=parsed_state_schema,
            title=title,
        )

    def create_place_candidates_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        normalized_parsed_state: ParsedState,
        memory_status: MemoryStatus,
        chat_response_text: str,
        title: str | None = None,
    ) -> ChatMessageResponse:
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)
        return ChatMessageResponse(
            threadId=thread_id,
            userId=user_id,
            chatResponse=chat_response_text,
            type=ChatResponseType.PLACE_CANDIDATES,
            memoryStatus=memory_status,
            parsedState=parsed_state_schema,
            title=title,
        )

    def create_recommendation_response(
        self,
        *,
        thread_id: str,
        user_id: int,
        normalized_parsed_state: ParsedState,
        memory_status: MemoryStatus,
        title: str | None = None,
        places: list[PlaceInfo] | None = None,
    ) -> ChatMessageResponse:
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)
        return ChatMessageResponse(
            threadId=thread_id,
            userId=user_id,
            chatResponse="좋아요! 말씀해주신 조건으로 장소를 추천해드릴게요.",
            type=ChatResponseType.RECOMMENDATION,
            memoryStatus=memory_status,
            parsedState=parsed_state_schema,
            title=title,
            places=places,
        )
