"""
OpenAI API 클라이언트
"""
import httpx
from typing import List, Dict, Optional
from apps.config import settings


class OpenAIClient:
    """OpenAI API 클라이언트"""
    
    def __init__(self):
        self.api_url = settings.gms_api_url
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 4096,
        temperature: float = 0.3
    ) -> Dict:
        """
        OpenAI Chat Completion API 호출
        
        Args:
            messages: 대화 메시지 리스트
            max_tokens: 최대 토큰 수
            temperature: 온도 설정
            
        Returns:
            API 응답 딕셔너리
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model,
            "messages": messages
        }
        
        # gpt-5-nano 등은 temperature 미지원, max_tokens 대신 max_completion_tokens 사용
        if "nano" not in self.model and "o1" not in self.model:
            payload["temperature"] = temperature
            payload["max_tokens"] = max_tokens
        else:
            payload["max_completion_tokens"] = max_tokens
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            if response.status_code >= 400:
                print(f"\n[API 상세 에러] {response.text}\n")
            response.raise_for_status()
            return response.json()
    
    def create_messages(
        self,
        system_content: str,
        user_content: str
    ) -> List[Dict[str, str]]:
        """
        메시지 리스트 생성
        
        Args:
            system_content: 시스템 메시지
            user_content: 사용자 메시지
            
        Returns:
            메시지 리스트
        """
        return [
            {"role": "developer", "content": system_content},
            {"role": "user", "content": user_content}
        ]
