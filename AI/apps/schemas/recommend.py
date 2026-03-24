"""
추천 관련 Pydantic DTO 스키마
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    """
    백엔드에서 Redis로 전달해주는 추천 요청 스키마
    - user_id: 추천을 받는 사용자
    - place_ids: 필터링(영업시간, 거리)이 끝난 후보 식당 리스트
    - short_term: 단기 기억(챗봇에서 추출된 3가지 카테고리 정보) {"cuisine_western": 0.8, ...}
    """
    user_id: int = Field(..., description="사용자 ID")
    place_ids: List[int] = Field(..., description="후보 식당 ID 목록")
    short_term: Dict[str, float] = Field(
        default_factory=dict, 
        description="단기기억: 키는 ORDERED_KEY_NAMES 중 하나, 값은 0.0~1.0"
    )
    top_k: int = Field(3, description="설정할 최대 반환 개수")


class RecommendItem(BaseModel):
    """
    개별 추천 결과 
    """
    place_id: int
    score: float = Field(..., description="코사인 유사도 점수")


class RecommendResponse(BaseModel):
    """
    추천 요청에 대한 응답 (Top K 리스트)
    """
    user_id: int
    recommendations: List[RecommendItem]
