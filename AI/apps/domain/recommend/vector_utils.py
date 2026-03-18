"""
벡터 연산 유틸리티
- 단기/장기 벡터 결합 (Vector Merge)
- 코사인 유사도 (Cosine Similarity) 계산
"""
import math
from typing import Dict, List, Tuple

from apps.domain.recommend.memory_keys import (
    VECTOR_DIM,
    KEY_TO_ENUM,
    ORDERED_KEY_NAMES,
)


# ────────────────────────────────────────
# 1. dict → 고정 길이 배열 변환
# ────────────────────────────────────────
def dict_to_vector(data: Dict[str, float], default: float = 0.0) -> List[float]:
    """
    {"cuisine_korean": 0.8, "vibe_quiet": 0.6} 형태의 딕셔너리를
    24차원 고정 길이 리스트로 변환합니다.

    Args:
        data: memory_key 이름(소문자) → 0.0~1.0 값 딕셔너리
        default: 딕셔너리에 없는 키에 채울 기본값

    Returns:
        길이 24의 float 리스트 (ORDERED_KEY_NAMES 순서)
    """
    return [data.get(key, default) for key in ORDERED_KEY_NAMES]


# ────────────────────────────────────────
# 2. 단기 + 장기 벡터 결합 (Weighted Merge)
# ────────────────────────────────────────
def merge_vectors(
    short_term: Dict[str, float],
    long_term: Dict[str, float],
    alpha: float = 0.7,
    beta: float = 0.3,
) -> List[float]:
    """
    단기기억 벡터(챗봇에서 추론한 값)와 장기기억 벡터(USER_MEMORY)를
    가중 합산하여 최종 유저 벡터를 생성합니다.

    규칙:
      - 단기기억에 값이 있는 차원: short * alpha + long * beta
      - 단기기억에 값이 없는 차원: 장기기억 값을 그대로 사용

    Args:
        short_term: 챗봇이 넘겨준 단기기억 (예: {"cuisine_western": 0.8, ...})
        long_term: DB USER_MEMORY에서 로드한 장기기억 (예: {"cuisine_korean": 0.5, ...})
        alpha: 단기기억 가중치 (기본 0.7)
        beta: 장기기억 가중치 (기본 0.3)

    Returns:
        길이 24의 float 리스트 (최종 유저 벡터)
    """
    merged = []
    for key in ORDERED_KEY_NAMES:
        long_val = long_term.get(key, 0.0)

        if key in short_term:
            # 단기 + 장기 가중 합산
            short_val = short_term[key]
            merged.append(short_val * alpha + long_val * beta)
        else:
            # 단기에 없으면 장기 값 그대로
            merged.append(long_val)

    return merged


# ────────────────────────────────────────
# 3. 코사인 유사도 계산
# ────────────────────────────────────────
def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    두 벡터 간의 코사인 유사도를 계산합니다.

    Returns:
        -1.0 ~ 1.0 사이의 유사도 값 (1에 가까울수록 유사)
        벡터 크기가 0인 경우 0.0 반환
    """
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))

    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0

    return dot / (mag_a * mag_b)


# ────────────────────────────────────────
# 4. 후보 식당 랭킹 (Top K 추출)
# ────────────────────────────────────────
def rank_places(
    user_vector: List[float],
    place_vectors: Dict[int, List[float]],
    top_k: int = 3,
) -> List[Tuple[int, float]]:
    """
    유저 벡터와 여러 식당 벡터를 비교하여 유사도 Top K를 반환합니다.

    Args:
        user_vector: 24차원 최종 유저 벡터
        place_vectors: {place_id: 24차원 벡터} 딕셔너리
        top_k: 상위 몇 개를 반환할지 (기본 3)

    Returns:
        [(place_id, similarity_score), ...] 유사도 내림차순 정렬된 리스트
    """
    scores = []
    for place_id, place_vec in place_vectors.items():
        sim = cosine_similarity(user_vector, place_vec)
        scores.append((place_id, sim))

    # 유사도 내림차순 정렬 후 Top K 반환
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]
