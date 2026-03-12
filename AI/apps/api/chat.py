"""
챗봇 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    PlaceCandidatesRequest,
    PlaceCandidatesResponse,
)

from apps.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()


@router.post("/api/v1/ai/chat/message", response_model=ChatMessageResponse)
async def process_chat_message(request: ChatMessageRequest):
    """
    대화 처리 API
    
    사용자 메시지를 받아 AI가 처리하고 응답을 반환합니다.
    조건부 필드(contextInjection, sessionState, preferenceSummary)는
    특정 상황에서만 포함됩니다.
    """
    try:
        response = await chat_service.process_message(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 처리 중 오류가 발생했습니다: {str(e)}")


@router.post("/api/v1/internal/ai/place-candidates", response_model=PlaceCandidatesResponse)
async def get_place_candidates(request: PlaceCandidatesRequest):
    """
    후보 장소 조회 API
    
    필터 조건에 맞는 장소 후보를 조회합니다.
    INTERNAL API로 AI 서버에서 백엔드 서버를 호출할 때 사용됩니다.
    """
    try:
        # TODO: Service 레이어 호출하여 실제 로직 구현
        response: PlaceCandidatesResponse = ChatMessageResponse(
            threadId=request.threadId,
            chatResponse="장소 후보를 조회했습니다.",
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"장소 후보 조회 중 오류가 발생했습니다: {str(e)}")
