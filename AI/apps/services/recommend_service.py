"""
추천 서비스 (Recommendation Service)

Redis로부터 수신한 추천 요청을 처리하는 메인 비즈니스 로직.
입력: user_id, place_ids, short_term (0~1 값)
출력: Top 3 추천 식당 (place_id, score)
"""
from typing import Dict, List, Tuple

from apps.domain.recommend.memory_keys import ORDERED_KEY_NAMES, VECTOR_DIM
from apps.domain.recommend.vector_utils import (
    dict_to_vector,
    merge_vectors,
    rank_places,
)


class RecommendService:
    """
    추천 파이프라인 오케스트레이터.

    현재는 DB 연동 없이 가상 데이터(mock)로 동작하며,
    DB/Redis 연동이 완료되면 _load_* 메서드만 교체하면 됩니다.
    """

    def __init__(self):
        pass

    # ──────────────────────────────────────
    # 메인 추천 파이프라인
    # ──────────────────────────────────────
    def recommend(
        self,
        user_id: int,
        place_ids: List[int],
        short_term: Dict[str, float],
        top_k: int = 3,
        alpha: float = 0.7,
        beta: float = 0.3,
    ) -> List[Tuple[int, float]]:
        """
        추천 실행 메인 메서드.

        Args:
            user_id: 추천 대상 유저 ID
            place_ids: 후보 식당 ID 리스트 (백엔드에서 필터링 완료된 목록)
            short_term: 단기기억 (챗봇 추론 결과, 예: {"cuisine_western": 0.8, ...})
            top_k: 상위 몇 개를 반환할지 (기본 3)
            alpha: 단기기억 가중치
            beta: 장기기억 가중치

        Returns:
            [(place_id, similarity_score), ...] 유사도 내림차순 Top K
        """
        # 1단계: 장기기억(USER_MEMORY) 로드
        long_term = self._load_user_memory(user_id)

        # 2단계: 단기 + 장기 벡터 결합 → 최종 유저 벡터
        user_vector = merge_vectors(
            short_term=short_term,
            long_term=long_term,
            alpha=alpha,
            beta=beta,
        )

        # 3단계: 후보 식당 벡터(PLACE_MEMORY_VECTOR) 로드
        place_vectors = self._load_place_vectors(place_ids)

        # 4단계: 코사인 유사도 계산 → Top K 추출
        results = rank_places(user_vector, place_vectors, top_k=top_k)

        return results

    # ──────────────────────────────────────
    # 데이터 로드 (TODO: DB 연동 시 교체)
    # ──────────────────────────────────────
    def _load_user_memory(self, user_id: int) -> Dict[str, float]:
        """
        DB USER_MEMORY 테이블에서 유저의 장기기억 벡터를 로드합니다.

        TODO: 실제 DB 연동 시 이 메서드를 교체
              SELECT memory_key, memory_value FROM user_memory WHERE user_id = ?
        """
        # Mock: Cold Start 유저 (모든 값 0.5로 초기화)
        return {key: 0.5 for key in ORDERED_KEY_NAMES}

    def _load_place_vectors(self, place_ids: List[int]) -> Dict[int, List[float]]:
        """
        DB PLACE_MEMORY_VECTOR 테이블에서 식당 벡터를 로드합니다.

        TODO: 실제 DB 연동 시 이 메서드를 교체
              SELECT place_id, vector_data FROM place_memory_vector
              WHERE place_id IN (...)
        """
        # Mock: 가상 식당 벡터 데이터 (테스트용)
        import random
        random.seed(42)  # 재현 가능한 결과를 위해 시드 고정

        mock_vectors = {}
        for pid in place_ids:
            random.seed(pid)  # place_id별 고유한 벡터 생성
            mock_vectors[pid] = [round(random.random(), 2) for _ in range(VECTOR_DIM)]

        return mock_vectors
