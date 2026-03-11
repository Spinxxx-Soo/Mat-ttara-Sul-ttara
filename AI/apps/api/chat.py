"""
챗봇 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    PlaceCandidatesRequest,
    PlaceCandidatesResponse,
    ParsedState
)

router = APIRouter()


@router.post("/api/v1/ai/chat/message", response_model=ChatMessageResponse)
async def process_chat_message(request: ChatMessageRequest):
    
    # TODO: 현재는 스키마 검증만 함.
    response = ChatMessageResponse(
        threadId=request.threadId,
        type="RECOMMENDATION",
        memoryStatus="OK",
        needFollowUp=False,
        chatResponse="응답이 준비되었습니다.",
        parsedState=ParsedState(
            area=None,
            people=None,
            time=None,
            purpose=None,
            mood=None
        ),
        places=[]
    )
    
    return response


@router.post("/api/v1/internal/ai/place_candidates", response_model=PlaceCandidatesResponse)
async def get_place_candidates(request: PlaceCandidatesRequest):
    
    # TODO: 현재는 스키마 검증만 임시로 넣어둠.
    response = PlaceCandidatesResponse(
        threadId=request.threadId,
        type="RECOMMENDATION",
        memoryStatus="OK",
        needFollowUp=False,
        chatResponse="장소 후보를 조회했습니다.",
        parsedState=ParsedState(
            area=request.filters.area,
            people=request.filters.people,
            time=request.filters.time,
            purpose=request.filters.purpose,
            mood=request.filters.mood
        ),
        places=[]
    )
    
    return response
