"""
챗봇 서비스 레이어
"""
from apps.schemas.chat import ChatMessageRequest, ChatMessageResponse, ChatResponseType, MemoryStatus
from apps.domain.chat.client import OpenAIClient


class ChatService:
    """챗봇 서비스"""
    
    def __init__(self):
        self.client = OpenAIClient()
    
    async def process_message(self, request: ChatMessageRequest) -> ChatMessageResponse:
        """
        사용자 메시지 처리
        
        Args:
            request: 챗봇 메시지 요청
            
        Returns:
            챗봇 응답
        """
        # 시스템 프롬프트 생성
        system_prompt = "당신은 친절한 장소 추천 챗봇입니다. 사용자의 요청에 대해 한국어로 답변해주세요."
        
        # 사용자 메시지
        user_message = request.message
        
        # OpenAI API 호출
        messages = self.client.create_messages(system_prompt, user_message)
        response = await self.client.chat_completion(messages)
        
        # 응답에서 텍스트 추출
        chat_response_text = response.get("choices", [{}])[0].get("message", {}).get("content", "응답을 생성할 수 없습니다.")
        
        # 기본 응답 생성 (현재는 임시 반환)
        return ChatMessageResponse(
            threadId=request.threadId,
            userId=str(request.userId),
            chatResponse=chat_response_text,
            type=ChatResponseType.FOLLOW_UP,
            memoryStatus=MemoryStatus.OK,
            parsedState=None
        )
