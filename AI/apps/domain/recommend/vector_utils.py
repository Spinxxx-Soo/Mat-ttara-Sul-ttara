"""
벡터 연산 유틸리티
- 단기/장기 벡터 결합 (Vector Merge)
- 코사인 유사도 (Cosine Similarity) 계산
"""
import math
from typing import Dict, List, Tuple, Optional

from apps.domain.recommend.memory_keys import ORDERED_KEY_NAMES


# ────────────────────────────────────────
# 1. dict → 고정 길이 배열 변환
# ────────────────────────────────────────
def dict_to_vector(
    data: Dict[str, Optional[float]], 
    default: Optional[float] = None
) -> List[Optional[float]]:
    """
    {"cuisine_korean": 0.8, "vibe_quiet": 0.6} 형태의 딕셔너리를
    24차원 고정 길이 리스트로 변환합니다.

    Args:
        data: memory_key 이름(소문자) → 값 딕셔너리
        default: 딕셔너리에 없는 키에 채울 기본값 (기본 None)

    Returns:
        길이 24의 Optional[float] 리스트 (ORDERED_KEY_NAMES 순서)
    """
    return [data.get(key, default) for key in ORDERED_KEY_NAMES]


# ────────────────────────────────────────
# 2. 단기 + 장기 벡터 결합 (Weighted Merge)
# ────────────────────────────────────────
def merge_vectors(
    short_term: Dict[str, Optional[float]],
    long_term: Dict[str, Optional[float]],
    alpha: float = 0.7,
    beta: float = 0.3,
) -> List[Optional[float]]:
    """
    단기기억 벡터(챗봇에서 추론한 값)와 장기기억 벡터(USER_MEMORY)를
    가중 합산하여 최종 유저 벡터를 생성합니다. (None 허용)

    규칙:
      - 단기 및 장기 모두 값이 있을 때: (short * alpha + long * beta) / (alpha + beta)
      - 단기가 있고 장기가 None일 때: short 값만 사용
      - 단기가 없고 장기는 있을 때: long 그대로 사용
      - 둘 다 없을 때(또는 None일 때): None 반환
    """
    if alpha < 0 or beta < 0:
        raise ValueError("alpha와 beta는 0 이상이어야 합니다.")
    
    weight_sum = alpha + beta
    if weight_sum == 0:
        raise ValueError("alpha + beta는 0보다 커야 합니다.")

    merged = []
    for key in ORDERED_KEY_NAMES:
        long_val = long_term.get(key, None)
        short_val = short_term.get(key, None)

        if short_val is not None and long_val is not None:
            merged.append((short_val * alpha + long_val * beta) / weight_sum)
        elif short_val is not None:
            merged.append(short_val)
        elif long_val is not None:
            merged.append(long_val)
        else:
            merged.append(None)

    return merged


# ────────────────────────────────────────
# 3. 코사인 유사도 계산
# ────────────────────────────────────────
def masked_cosine_similarity(vec_a: List[Optional[float]], vec_b: List[Optional[float]], min_overlap: int = 3) -> float:
    """
    두 벡터 간의 Cosine Similarity를 계산하되, None(결측치)이 있는 차원은 배제하고 연산합니다.
    (커버리지 보정 추가: 매칭되는 차원이 너무 적으면 우연의 일치로 높은 점수를 받는 것을 방지)
    """
    paired = [
        (a, b) for a, b in zip(vec_a, vec_b)
        if a is not None and b is not None
    ]

    # 최소 겹침 수 보장: 정보가 너무 빈약하여 겹치는 특성이 적으면 아예 추천 점수 0점 처리
    if len(paired) < min_overlap:
        return 0.0

    # 기준 1: 유저(vec_a)가 가지고 있는 전체 유효(Non-Null) 정보 개수
    valid_a_count = sum(1 for a in vec_a if a is not None)
    if valid_a_count == 0:
        return 0.0

    # 커버리지: 유저의 취향 중 식당 정보와 실제로 매칭하여 비교한 비율
    # (예: 유저 취향 20개 중 2개만 겹쳤다면 2/20 = 0.1 커버리지)
    coverage = len(paired) / valid_a_count

    user_vals = [u for u, _ in paired]
    place_vals = [p for _, p in paired]

    dot = sum(u * p for u, p in zip(user_vals, place_vals))
    norm_u = math.sqrt(sum(u * u for u in user_vals))
    norm_p = math.sqrt(sum(p * p for p in place_vals))

    if norm_u == 0 or norm_p == 0:
        return 0.0

    base_sim = dot / (norm_u * norm_p)
    
    # 커버리지 페널티 적용 (기본 유사도 * 매칭 비율)
    return base_sim * coverage


# ────────────────────────────────────────
# 4. 후보 식당 랭킹 (Top K 추출)
# ────────────────────────────────────────
def rank_places(
    user_vector: List[Optional[float]],
    place_vectors: Dict[int, List[Optional[float]]],
    top_k: int = 3,
    min_known: int = 5,
) -> List[Tuple[int, float]]:
    """
    유저 벡터와 여러 식당 벡터를 비교하여 유사도 Top K를 반환합니다.

    Args:
        user_vector: 24차원 최종 유저 벡터
        place_vectors: {place_id: 24차원 벡터} 딕셔너리
        top_k: 상위 몇 개를 반환할지 (기본 3)
        min_known: 식당 벡터가 최소로 가져야 할 유효 정보(None 아님)의 수

    Returns:
        [(place_id, similarity_score), ...] 유사도 내림차순 정렬된 리스트
    """
    scores = []
    for place_id, place_vec in place_vectors.items():
        # 식당 자체가 정보가 너무 빈약한 경우(거의 다 None) 신뢰도가 낮아 아예 랭킹에서 제외
        known_dims = sum(1 for v in place_vec if v is not None)
        if known_dims < min_known:
            continue

        sim = masked_cosine_similarity(user_vector, place_vec)
        scores.append((place_id, sim))

    # 유사도 내림차순 정렬 후 Top K 반환
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]
