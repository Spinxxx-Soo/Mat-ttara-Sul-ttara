"""채팅 HTTP 엔드포인트."""
import logging

from fastapi import APIRouter, HTTPException

from apps.schemas.chat_schemas import ChatMessageRequest, ChatMessageResponse
from apps.services.chat.chat_service import ChatService

logger = logging.getLogger(__name__)

router = APIRouter()
chat_service = ChatService()


@router.post("/api/v1/ai/chat/message", response_model=ChatMessageResponse)
async def process_chat_message(request: ChatMessageRequest):
    """대화 처리 API"""
    try:
        response = await chat_service.process_message(request)
        parsed_state = getattr(response, "parsedState", None)
        preference_summary = getattr(request, "preferenceSummary", None)
        response_text = getattr(response, "chatResponse", None)
        print("parsed_state =", parsed_state)
        print("preference_summary =", preference_summary)
        print("response_text =", response_text)
        return response
    except Exception as e:
        logger.exception("챗봇 처리 실패 threadId=%s", getattr(request, "threadId", None))
        raise HTTPException(status_code=500, detail=f"챗봇 처리 중 오류가 발생했습니다: {str(e)}")
