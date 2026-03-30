from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Place(BaseModel):
    """
    ERD 4번 테이블 (PLACES) 매핑 스키마
    기본 뼈대는 KAKAO 로컬 API 데이터로 생성하고, 
    이후 Google API (영업시간) 및 별도 크롤링(메뉴 등)으로 필드를 갱신(Update)합니다.
    """
    external_place_id: str = Field(..., description="카카오 장소 고유 ID (kakao_place_id)")
    name: str = Field(..., description="카카오로부터 받은 가게 이름")
    address: Optional[str] = Field(None, description="카카오로부터 받은 주소")
    provider: str = Field(default="KAKAO", description="데이터 원천 제공자 (고정)")
    image_url: Optional[str] = Field(None, description="가게 이미지 (추후 크롤링으로 보완)")
    category: Optional[str] = Field(None, description="카카오로부터 받은 카테고리")
    is_open: bool = Field(default=True, description="현재 영업 중 여부 (초기값 True, 구글 갱신 시 업데이트)")
    last_status_checked_at: Optional[datetime] = Field(None, description="마지막 is_open 확인 시간 (구글 갱신 시각)")
    lat: float = Field(..., description="카카오로부터 받은 위도")
    lng: float = Field(..., description="카카오로부터 받은 경도")
    url: Optional[str] = Field(None, description="카카오 가게 상세페이지 URL")
    phone: Optional[str] = Field(None, description="카카오로부터 받은 전화번호")
    opening_hours: Optional[str] = Field(None, description="구글 API 요일별 영업시간 (JSON 형식 문자열)")
    description: Optional[str] = Field(None, description="가게 특징 및 소개 (추후 크롤링으로 보완)")
    created_at: Optional[datetime] = Field(None, description="DB 최초 저장 시각")
    last_updated_at: Optional[datetime] = Field(None, description="데이터 최근 갱신 시각")

class KakaoPlaceDocument(BaseModel):
    """카카오 로컬 API 검색 결과의 단일 장소 문서 파싱용 DTO"""
    id: str
    place_name: str
    category_name: str
    phone: str
    address_name: str
    road_address_name: str
    x: str
    y: str
    place_url: str

    def to_unified_place(self) -> Place:
        """카카오 API 객체 -> 최종 Unified Place 스키마 객체로 변환"""
        addr = self.road_address_name if self.road_address_name.strip() else self.address_name
        return Place(
            external_place_id=self.id,
            name=self.place_name,
            address=addr,
            provider="KAKAO",
            category=self.category_name,
            lat=float(self.y),
            lng=float(self.x),
            phone=self.phone if self.phone else None,
            url=self.place_url
        )
