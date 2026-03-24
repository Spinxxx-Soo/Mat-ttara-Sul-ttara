"""
24차원 Memory Key 정의 (memory_key_design.md 기반)

유저 벡터와 식당 벡터 모두 이 키 순서(INDEX)를 기준으로 배열을 생성합니다.
키를 추가/삭제할 때 이 파일 하나만 수정하면 전체 시스템에 반영됩니다.
"""
from enum import IntEnum
from typing import Dict, List


class MemoryKey(IntEnum):
    """
    24차원 벡터의 각 차원을 정의하는 Enum.
    IntEnum이므로 MemoryKey.CUISINE_KOREAN == 0 처럼 인덱스로 직접 사용 가능.
    """
    # ── 🍽️ 음식 종류 (Cuisine) ──
    CUISINE_KOREAN      = 0   # 한식 선호도
    CUISINE_JAPANESE    = 1   # 일식 선호도
    CUISINE_CHINESE     = 2   # 중식 선호도
    CUISINE_WESTERN     = 3   # 양식 선호도
    CUISINE_BUNSIK      = 4   # 분식/카페 선호도
    CUISINE_ASIAN_OTHER = 5   # 기타 아시아 음식 선호도

    # ── 💰 가격대 ──
    PRICE_RANGE         = 6   # 가격대 선호 (0=저가, 1=고가)

    # ── 🏠 분위기/공간 ──
    VIBE_QUIET          = 7   # 조용한 분위기 선호
    VIBE_LIVELY         = 8   # 활기찬/왁자지껄 선호
    VIBE_MODERN         = 9   # 트렌디/모던 인테리어 선호
    VIBE_TRADITIONAL    = 10  # 전통적/레트로 분위기 선호
    SEAT_PRIVATE        = 11  # 독립룸/프라이빗석 선호
    OUTDOOR_OK          = 12  # 야외석 허용 여부

    # ── 👥 혼잡도/편의 ──
    CROWD_TOLERANCE     = 13  # 혼잡도 허용 수준
    WAIT_TOLERANCE      = 14  # 웨이팅 허용 수준
    PARKING_AVAILABLE   = 15  # 주차 가능 여부

    # ── 🎯 방문 목적/동반자 ──
    OCCASION_SOLO       = 16  # 혼밥 빈도
    OCCASION_DATE       = 17  # 데이트 목적 빈도
    OCCASION_FRIENDS    = 18  # 친구 모임 빈도
    OCCASION_FAMILY     = 19  # 가족 모임 빈도
    OCCASION_BUSINESS   = 20  # 비즈니스/접대 빈도

    # ── 😋 맛 성향 ──
    TASTE_SPICY         = 21  # 매운 음식 선호
    TASTE_LIGHT         = 22  # 담백/건강식 선호
    TASTE_RICH          = 23  # 진하고 자극적인 맛 선호


# ── 편의 상수 ──
VECTOR_DIM = len(MemoryKey)  # 24

# DB의 memory_key 문자열 ↔ Enum 매핑 (양방향 룩업)
KEY_TO_ENUM: Dict[str, MemoryKey] = {k.name.lower(): k for k in MemoryKey}
ENUM_TO_KEY: Dict[MemoryKey, str] = {k: k.name.lower() for k in MemoryKey}

# 순서 보장된 키 이름 리스트 (벡터 인덱스 순서)
ORDERED_KEY_NAMES: List[str] = [k.name.lower() for k in MemoryKey]


# ── 단기기억 카테고리 그룹 정의 ──
# 챗봇이 넘겨주는 단기기억 3종(음식/분위기/방문목적)에 해당하는 키 그룹
SHORT_TERM_GROUPS = {
    "cuisine": [
        MemoryKey.CUISINE_KOREAN, MemoryKey.CUISINE_JAPANESE,
        MemoryKey.CUISINE_CHINESE, MemoryKey.CUISINE_WESTERN,
        MemoryKey.CUISINE_BUNSIK, MemoryKey.CUISINE_ASIAN_OTHER,
    ],
    "vibe": [
        MemoryKey.VIBE_QUIET, MemoryKey.VIBE_LIVELY,
        MemoryKey.VIBE_MODERN, MemoryKey.VIBE_TRADITIONAL,
        MemoryKey.SEAT_PRIVATE, MemoryKey.OUTDOOR_OK,
    ],
    "occasion": [
        MemoryKey.OCCASION_SOLO, MemoryKey.OCCASION_DATE,
        MemoryKey.OCCASION_FRIENDS, MemoryKey.OCCASION_FAMILY,
        MemoryKey.OCCASION_BUSINESS,
    ],
}
