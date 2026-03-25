"""
챗봇 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    PlaceCandidatesRequest,
    PlaceCandidatesResponse,
    ChatResponseType,
    MemoryStatus,
)

from apps.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()


@router.post("/api/v1/ai/chat/message", response_model=ChatMessageResponse)
async def process_chat_message(request: ChatMessageRequest):
    """
    대화 처리 API
    """
    try:
        response = await chat_service.process_message(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 처리 중 오류가 발생했습니다: {str(e)}")


@router.post("/api/v1/internal/ai/place-candidates", response_model=PlaceCandidatesResponse)
async def get_place_candidates(request: PlaceCandidatesRequest):
    """
    후보 장소 조회 API -> 추후 redis 변경
    """
    try:
        # TODO: Service 레이어 호출하여 실제 로직 구현
        # TODO: userId를 threadId에서 추출하거나 별도로 받아야 함
        response: PlaceCandidatesResponse = ChatMessageResponse(
            threadId=request.threadId,
            userId="0",  # TODO: 실제 userId로 변경 필요
            chatResponse="장소 후보를 조회했습니다.",
            type=ChatResponseType.RECOMMENDATION,
            memoryStatus=MemoryStatus.OK,
            parsedState=None
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"장소 후보 조회 중 오류가 발생했습니다: {str(e)}")
